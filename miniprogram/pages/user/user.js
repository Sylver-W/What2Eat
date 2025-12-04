const db = wx.cloud.database()
Page({
  data: {
    active: 'user',
    // 登录态
    isLoggedIn: false,
    // 用户信息
    userAvatar: "",
    userNickname: "",
    defaultAvatar: "../../images/default-avatar.png",   // 未登录默认头像
    favouriteCount: 0,
    commentCount: 0
  },

  onLoad() {
    this.restoreLoginState()
  },
  onShow() {
    this.restoreLoginState()
  },  
  // 检查登录状态：先读本地缓存，无则调用云函数查询
  restoreLoginState() {
    const openid = wx.getStorageSync("openid")
    // 未登录
    if (!openid) {
      this.setData({
        isLoggedIn: false,
        userAvatar: this.data.defaultAvatar,
        userNickname: ""
      })
      return
    }
    // 已登录，开始获取数据库用户资料
    this.fetchUserFromDB(openid)
  },

  fetchUserFromDB(openid) {
    wx.showLoading({ title: "加载中" })
    db.collection("user").doc(openid).get()
      .then(res => {
        wx.hideLoading()
        const user = res.data
        if (!user) {
          // 本地有 openid 但数据库没有对应用户 → 视为未注册
          this.setData({
            isLoggedIn: false,
            userAvatar: this.data.defaultAvatar,
            userNickname: ""
          })
          return
        }
        // 写入页面数据
        this.setData({
          isLoggedIn: true,
          userAvatar: user.avatarUrl || this.data.defaultAvatar,
          userNickname: user.nickname || ""
        })
        // 写入缓存（方便首页等页面使用）
        wx.setStorageSync("userInfo", user)
      })
    .catch(err => {
      wx.hideLoading()
      console.error("获取用户数据失败：", err)
    })
  },
  onAvatarTap() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: "/pages/login/login"
      })
      return
    }
    wx.navigateTo({ url: "/pages/peisonalInfo/index" })
  },
  goPersonalInfo() {
    if(this.data.isLoggedIn)
    {
      wx.navigateTo({ url: '/pages/user/personalInfo/index' })
    }
    else{
      wx.navigateTo({
        url: '/pages/login/login',
      })
    }
    
  },
  goCollectDish() {
    wx.navigateTo({ url: '/pages/user/collectDish/index' })
  },
  goMyComment() {
    wx.navigateTo({ url: '/pages/user/myComment/index' })
  },
  goAddDish() {
    wx.navigateTo({ url: '/pages/user/addDish/index' })
  },
  onChange(event) {
    const name = event.detail;
    console.log('切换到:', name);
    if (name === 'canteen') {
      wx.navigateTo({ url: '/pages/canteen/canteen' });
    } else if (name === 'home') {
      wx.navigateTo({ url: '/pages/index/index' });
    }
  },
  goCanteenList() {
    wx.navigateTo({ url: '/pages/canteen/canteen' })
  },
  goDishSearch() {
    wx.navigateTo({ url: '/pages/search/index' })
  },
  goIntroDetail() {
    wx.navigateTo({ url: '/pages/intro/index' })
  }
})