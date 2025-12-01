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
    this.checkBusinessHours();
  },

  async loadCanteens(){
    try {
      const list = await request("getcanteenlist");
      this.setData({
        canteens: list
      });
    } catch (err) {
      console.error("获取食堂失败:", err);
    }
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

  // 搜索功能
  onSearch(event) {
    const value = event.detail;
    this.setData({ searchValue: value });
    console.log('搜索:', value);
  },

  // 跳转到食堂详情
  goCanteenDetail(e) {
    const canteen = e.currentTarget.dataset.canteen;
    wx.navigateTo({
      url: `/pages/canteen-detail/canteen-detail?id=${canteen.id}&name=${canteen.name}`
    });
  },

  onChange(event) {
    // 推荐：使用 event.detail 获取点击项的名称 (name)
    const name = event.detail; 
    // 如果你的Vant版本返回的是索引，则用下面这行获取索引
    // const index = event.detail; 

    console.log('切换到:', name); // 打印日志，方便调试

    if (name === 'home') {
      // 跳转到首页页面
      wx.navigateTo({
        url: '/pages/index/index'
      });
    } else if (name === 'user') {
      // 这里先注释掉，等以后创建了用户页面再启用
      // wx.navigateTo({
      //   url: '/pages/user/user'
      // });
      wx.showToast({
        title: '用户页面开发中',
        icon: 'none'
      });
    }
    // 点击"首页"时，由于已在首页，可以不处理，或者你希望有些效果（比如刷新），可以在这里写。
  },
})