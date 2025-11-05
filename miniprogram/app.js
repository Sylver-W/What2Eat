App({
  globalData: {
    userInfo: null,
    openid: '',
    role: 'user'
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true
      });
    }
    const storageUser = wx.getStorageSync('userInfo');
    if (storageUser) {
      this.globalData.userInfo = storageUser;
      this.globalData.openid = storageUser.openid;
      this.globalData.role = storageUser.role || 'user';
    }
  }
});
