
App({
  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-9gqate3z0c742201'  // 从云开发控制台复制
    })
  },
  globalData: {
    openid: null,
    userInfo: null
  }
})
