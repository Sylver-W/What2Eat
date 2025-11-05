const app = getApp();

Page({
  data: {
    userInfo: {},
    favorites: [],
    checkins: [],
    comments: [],
    myDishes: [],
    lastLogin: '',
    activeTab: 0,
    defaultAvatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
  },
  onShow() {
    this.loadProfile();
    this.loadMyDishes();
  },
  loadProfile() {
    const storage = wx.getStorageSync('userInfo');
    if (storage) {
      this.setData({
        userInfo: storage,
        lastLogin: new Date().toLocaleString(),
        favorites: storage.favorites || []
      });
    }
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: { openid: app.globalData.openid }
    }).then(res => {
      if (res.result && res.result.user) {
        const user = { ...res.result.user, ...this.data.userInfo };
        this.setData({ userInfo: user });
        wx.setStorageSync('userInfo', user);
      }
    }).catch(err => {
      console.error('刷新用户信息失败', err);
    });
  },
  loadMyDishes() {
    if (!app.globalData.openid) return;
    const db = wx.cloud.database();
    db.collection('dishes')
      .where({ uploader: app.globalData.openid })
      .get()
      .then(res => {
        this.setData({ myDishes: res.data });
      })
      .catch(err => {
        console.error('加载菜品失败', err);
      });
  },
  onTabChange(event) {
    this.setData({ activeTab: event.detail.index });
  },
  deleteDish(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后需要重新提交审核，是否继续？',
      success: res => {
        if (res.confirm) {
          wx.cloud.database().collection('dishes').doc(id).remove().then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadMyDishes();
          }).catch(err => {
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'error' });
          });
        }
      }
    });
  },
  editProfile() {
    wx.navigateTo({ url: '/pages/register/register?edit=1' });
  },
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('tempProfile');
          app.globalData.userInfo = null;
          app.globalData.openid = '';
          app.globalData.role = 'user';
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});
