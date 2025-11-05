const app = getApp();

Page({
  data: {
    keyword: '',
    activeTab: 0,
    promos: [
      { title: '紫菘食堂早餐', desc: '7:00 前打卡享 8 折' },
      { title: '韵苑美食周', desc: '新品套餐第二份半价' }
    ],
    seasonal: [],
    allDishes: [],
    recommendList: [],
    breakfastList: [],
    lunchList: [],
    newList: []
  },
  onShow() {
    this.fetchDishes();
  },
  fetchDishes() {
    wx.showLoading({ title: '加载中' });
    wx.cloud.callFunction({
      name: 'getDishes',
      data: { keyword: this.data.keyword }
    }).then(res => {
      const dishes = res.result.dishes || [];
      const seasonal = dishes.filter(item => item.tags && item.tags.includes('时令'));
      const recommendList = dishes.filter(item => item.tags && item.tags.includes('推荐'));
      const breakfastList = dishes.filter(item => item.tags && item.tags.includes('早餐'));
      const lunchList = dishes.filter(item => item.tags && item.tags.includes('正餐'));
      const newList = dishes.filter(item => item.tags && item.tags.includes('新品'));
      this.setData({
        allDishes: dishes,
        seasonal,
        recommendList,
        breakfastList,
        lunchList,
        newList
      });
    }).catch(err => {
      console.error('获取菜品失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    }).finally(() => {
      wx.hideLoading();
    });
  },
  onSearchChange(event) {
    this.setData({ keyword: event.detail });
  },
  onSearch() {
    this.fetchDishes();
  },
  onTabChange(event) {
    this.setData({ activeTab: event.detail.index });
  },
  goDish(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/mine/mine?dishId=${id}`
    });
  }
});
