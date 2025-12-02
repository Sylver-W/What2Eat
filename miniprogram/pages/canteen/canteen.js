// pages/canteen/canteen.js
import { request } from "../../utils/request";
import regeneratorRuntime from '../../utils/runtime';

Page({
  data: {
    active: 'canteen',
    searchValue: '',
    canteens: []
  },

  onLoad() {
    console.log('食堂页面加载');
    this.loadCanteens();
  },

  async loadCanteens(){
    try {
      const result = await request("getcanteenlist");
      console.log("云函数返回结果:", result);
      
      // 直接处理数组格式的结果
      let list = [];
      
      if (Array.isArray(result)) {
        list = result;
        console.log("获取到食堂数量:", list.length);
      } else if (result && result.code === 0 && result.data) {
        // 如果云函数返回的是对象格式
        list = result.data;
      } else if (result && result.data && Array.isArray(result.data)) {
        // 另一种对象格式
        list = result.data;
      } else {
        console.warn("未知的返回格式，尝试直接使用:", result);
        list = result || [];
      }
      
      if (list.length === 0) {
        console.warn("食堂列表为空");
        return;
      }
      
      // 处理数据
      const processedList = list.map((item, index) => {
        console.log(`食堂${index + 1} ${item.name}:`, {
          图片: item.image,
          特色: item.featuredDishes
        });
        
        // 处理特色菜品显示
        let featuredDisplay = '';
        if (Array.isArray(item.featuredDishes)) {
          featuredDisplay = item.featuredDishes.join('、');
        } else if (item.featuredDishes) {
          featuredDisplay = item.featuredDishes;
        }
        
        return {
          ...item,
          featuredDisplay: featuredDisplay,
          // 确保有必要的字段
          canteenId: item.canteenId || item.id || index + 1,
          rating: item.rating || 4.0
        };
      });
      
      console.log("处理后的数据:", processedList);
      
      this.setData({
        canteens: processedList
      }, () => {
        // 数据设置完成后检查营业状态
        this.checkBusinessHours();
      });
      
    } catch (err) {
      console.error("获取食堂失败:", err);
      // 可以在这里添加降级方案
      this.showErrorToast();
    }
  },

  // 显示错误提示
  showErrorToast() {
    wx.showToast({
      title: '加载失败，请重试',
      icon: 'none',
      duration: 2000
    });
  },

  // 检查营业状态
  checkBusinessHours() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour + currentMinutes / 60;

    const canteens = this.data.canteens.map(canteen => {
      let isOpen = false;
      const hours = canteen.businessHours;
      
      if (!hours) return { ...canteen, isOpen };
      
      // 简化的营业时间判断逻辑
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

  // 其他方法保持不变...
  onSearch(event) {
    const value = event.detail;
    this.setData({ searchValue: value });
    console.log('搜索:', value);
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
  },
})