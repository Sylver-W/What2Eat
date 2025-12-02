// pages/canteen/canteen.js
import { request } from "../../utils/request";
import regeneratorRuntime from '../../utils/runtime';

Page({
  data: {
    active: 'canteen',
    searchValue: '',
    canteens: [],
    originalCanteens: [],
    userRatings: {},
    isSubmitting: false // 防止重复提交
  },

  onLoad() {
    console.log('食堂页面加载');
    this.loadUserRatings();
    this.loadCanteens();
  },

  loadUserRatings() {
    const userRatings = wx.getStorageSync('userRatings') || {};
    this.setData({ userRatings });
    console.log('加载用户评分缓存:', userRatings);
  },

  saveUserRatings() {
    wx.setStorageSync('userRatings', this.data.userRatings);
  },

  formatRating(rating) {
    if (rating === null || rating === undefined) return '4.0';
    return Number(rating).toFixed(1);
  },

  async loadCanteens() {
    try {
      wx.showLoading({ title: '加载中' });
      
      const result = await request("getcanteenlist");
      console.log("云函数返回结果类型:", typeof result);
      console.log("云函数返回结果:", result);
      
      let list = [];
      
      // 处理不同的返回格式
      if (Array.isArray(result)) {
        // 格式1：直接返回数组
        list = result;
        console.log("获取到食堂数量（数组格式）:", list.length);
      } else if (result && result.code === 0 && Array.isArray(result.data)) {
        // 格式2：返回 {code: 0, data: [...]}
        list = result.data;
        console.log("获取到食堂数量（对象格式）:", list.length);
      } else if (result && result.data && Array.isArray(result.data)) {
        // 格式3：返回 {data: [...]}
        list = result.data;
        console.log("获取到食堂数量（data格式）:", list.length);
      } else {
        console.warn("未知的返回格式:", result);
        list = result || [];
      }
      
      if (list.length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '暂无食堂数据',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 处理数据，合并用户评分
      const processedList = list.map((item, index) => {
        const canteenId = item.canteenId || index + 1;
        const userRating = this.data.userRatings[canteenId];
        
        // 清理评分数据（去空格，转数字）
        let ratingValue = 4.0;
        if (item.rating !== undefined && item.rating !== null) {
          const ratingStr = String(item.rating).trim();
          ratingValue = parseFloat(ratingStr);
          if (isNaN(ratingValue)) ratingValue = 4.0;
        }
        
        // 处理特色菜品显示
        let featuredDisplay = '';
        if (Array.isArray(item.featuredDishes)) {
          featuredDisplay = item.featuredDishes.join('、');
        } else if (item.featuredDishes) {
          featuredDisplay = item.featuredDishes;
        }
        
        // 确定显示的评分
        const displayRatingValue = userRating !== undefined ? userRating : ratingValue;
        
        return {
          ...item,
          featuredDisplay: featuredDisplay,
          canteenId: canteenId,
          rating: ratingValue,
          ratingCount: parseInt(item.ratingCount) || 0,
          userRating: userRating !== undefined ? userRating : null,
          displayRating: this.formatRating(displayRatingValue),
          isOpen: true // 默认值，后续 checkBusinessHours 会更新
        };
      });
      
      console.log("处理后的数据:", processedList);
      
      this.setData({
        canteens: processedList,
        originalCanteens: processedList
      }, () => {
        console.log("数据已设置，canteens数量:", this.data.canteens.length);
        this.checkBusinessHours();
        wx.hideLoading();
      });
      
    } catch (err) {
      wx.hideLoading();
      console.error("获取食堂失败:", err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 评分变更事件 - 添加防重复点击
  onRateChange(event) {
    if (this.data.isSubmitting) {
      console.log('正在提交，请稍候');
      return;
    }
    
    const { canteenId, index } = event.currentTarget.dataset;
    const rating = event.detail;
    
    console.log(`为食堂 ${canteenId} 评分: ${rating}`);
    
    // 1. 更新用户评分缓存
    const userRatings = {
      ...this.data.userRatings,
      [canteenId]: rating
    };
    
    // 2. 更新显示列表
    const canteens = [...this.data.canteens];
    if (canteens[index]) {
      canteens[index].userRating = rating;
      canteens[index].displayRating = this.formatRating(rating);
    }
    
    // 3. 立即更新UI
    this.setData({
      userRatings,
      canteens,
      isSubmitting: true
    }, () => {
      // 保存到本地缓存
      this.saveUserRatings();
      
      // 显示评分成功提示
      wx.showToast({
        title: '评分已保存',
        icon: 'success',
        duration: 1500
      });
      
      // 异步提交到云端（不阻塞用户操作）
      setTimeout(() => {
        this.submitRatingToCloud(canteenId, rating, index);
      }, 500);
    });
  },

  // 提交评分到云端
  // 提交评分到云端 - 修复版
async submitRatingToCloud(canteenId, rating, index) {
  try {
    console.log('开始提交评分到云端:', { canteenId, rating });
    
    const result = await request("submitRating", {
      canteenId: canteenId,
      rating: rating
    });
    
    console.log('云端返回完整结果:', result);
    
    // 修复判断逻辑：云函数可能返回不同的格式
    if (result && (result.code === 0 || result.newAverageRating !== undefined)) {
      // 云端提交成功
      console.log('云端评分成功:', result);
      
      // 获取实际的数据部分
      const data = result.data || result;
      
      // 如果云端返回了新的平均分，更新显示
      if (data.newAverageRating !== undefined) {
        const canteens = [...this.data.canteens];
        if (canteens[index]) {
          canteens[index].rating = data.newAverageRating;
          canteens[index].ratingCount = data.ratingCount || 0;
          // 显示评分：优先用户评分，其次云端平均分
          canteens[index].displayRating = this.formatRating(
            canteens[index].userRating || data.newAverageRating
          );
        }
        
        this.setData({ canteens });
      }
      
      // 显示云端成功提示
      wx.showToast({
        title: data.hasRatedBefore ? '评分已更新' : '评分成功',
        icon: 'success',
        duration: 2000
      });
      
    } else {
      // 云端提交失败，但本地已保存
      console.warn('云端提交失败:', result?.msg || result);
      wx.showToast({
        title: '本地已保存，云端同步失败',
        icon: 'none',
        duration: 2000
      });
    }
    
  } catch (err) {
    console.error('云端提交异常:', err);
    // 网络错误等异常情况，本地评分已保存，不影响使用
  } finally {
    // 无论成功失败，都重置提交状态
    this.setData({ isSubmitting: false });
  }
},

  // 其他方法保持不变...
  checkBusinessHours() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour + currentMinutes / 60;

    const canteens = this.data.canteens.map(canteen => {
      let isOpen = false;
      const hours = canteen.businessHours;
      
      if (!hours) return { ...canteen, isOpen };
      
      if (hours.includes('早餐') && currentTime >= 6.83 && currentTime <= 9) {
        isOpen = true;
      } else if (hours.includes('中餐') && currentTime >= 11 && currentTime <= 14) {
        isOpen = true;
      } else if (hours.includes('晚餐') && currentTime >= 16.5 && currentTime <= 23) {
        isOpen = true;
      } else if (hours.includes('早中餐') && currentTime >= 6.83 && currentTime <= 14) {
        isOpen = true;
      }
      
      return { ...canteen, isOpen };
    });

    this.setData({ canteens });
  },

  onSearch(event) {
    const searchValue = event.detail;
    console.log('搜索关键词:', searchValue);
    
    if (!searchValue || searchValue.trim() === '') {
      this.setData({
        searchValue: '',
        canteens: this.data.originalCanteens
      }, () => {
        this.checkBusinessHours();
      });
      return;
    }
    
    const keyword = searchValue.toLowerCase().trim();
    const filteredCanteens = this.data.originalCanteens.filter(canteen => {
      return (
        (canteen.name && canteen.name.toLowerCase().includes(keyword)) ||
        (canteen.location && canteen.location.toLowerCase().includes(keyword)) ||
        (canteen.featuredDisplay && canteen.featuredDisplay.toLowerCase().includes(keyword))
      );
    });
    
    this.setData({
      searchValue: searchValue,
      canteens: filteredCanteens
    }, () => {
      this.checkBusinessHours();
    });
  },

  onClear() {
    this.setData({
      searchValue: '',
      canteens: this.data.originalCanteens
    }, () => {
      this.checkBusinessHours();
    });
  },

  goCanteenDetail(e) {
    const canteen = e.currentTarget.dataset.canteen;
    wx.navigateTo({
      url: `/pages/canteen-detail/canteen-detail?id=${canteen.canteenId}&name=${encodeURIComponent(canteen.name)}`
    });
  },

  onChange(event) {
    const name = event.detail; 
    console.log('切换到:', name);

    if (name === 'home') {
      wx.navigateTo({
        url: '/pages/index/index'
      });
    } else if (name === 'user') {
      wx.navigateTo({
         url: '/pages/user/user'
      });
    }
  }
})