// pages/user/index.js
const db = wx.cloud.database()
Page({
  data: {
    active: 'user',
    isLoggedIn: false,
    userAvatar: "",
    userNickname: "",
    defaultAvatar: "../../images/default-avatar.png",
    favouriteCount: 0,
    commentCount: 0
  },

  onLoad() {
    console.log('用户页面加载')
    this.restoreLoginState()
  },
  
  onShow() {
    console.log('用户页面显示')
    this.restoreLoginState()
  },  
  
  restoreLoginState() {
    const openid = wx.getStorageSync("openid")
    console.log('获取到的openid:', openid)
    
    if (!openid) {
      console.log('未检测到openid，用户未登录')
      this.setData({
        isLoggedIn: false,
        userAvatar: this.data.defaultAvatar,
        userNickname: "",
        favouriteCount: 0,
        commentCount: 0
      })
      return
    }
    
    console.log('用户已登录，openid:', openid)
    this.fetchUserFromDB(openid)
  },

  fetchUserFromDB(openid) {
    console.log('开始获取用户信息，openid:', openid)
    wx.showLoading({ title: "加载中" })
    
    db.collection("user").doc(openid).get()
      .then(res => {
        wx.hideLoading()
        console.log('获取用户信息成功:', res.data)
        
        const user = res.data
        if (!user) {
          console.log('数据库中没有找到用户信息')
          this.setData({
            isLoggedIn: false,
            userAvatar: this.data.defaultAvatar,
            userNickname: "",
            favouriteCount: 0,
            commentCount: 0
          })
          return
        }
        
        console.log('用户信息找到，昵称:', user.nickname)
        this.setData({
          isLoggedIn: true,
          userAvatar: user.avatarUrl || this.data.defaultAvatar,
          userNickname: user.nickname || ""
        })
        
        wx.setStorageSync("userInfo", user)
        
        // 登录成功后获取数量
        console.log('开始获取收藏和评价数量')
        this.getFavouriteCount(openid)
        this.getCommentCount(openid)
      })
      .catch(err => {
        wx.hideLoading()
        console.error("获取用户数据失败:", err)
        this.setData({
          favouriteCount: 0,
          commentCount: 0
        })
      })
  },

  // 获取收藏数量 - 增强日志
  getFavouriteCount(openid) {
    console.log('调用收藏数量云函数，openid:', openid)
    
    wx.cloud.callFunction({
      name: 'favouriteOperations',
      data: {
        operation: 'getCount',
        userId: openid
      }
    })
    .then(res => {
      console.log('收藏数量云函数返回:', res)
      console.log('result结构:', JSON.stringify(res.result))
      
      if (res.result) {
        if (res.result.success === true) {
          const count = res.result.count || 0
          console.log('收藏数量获取成功:', count)
          this.setData({
            favouriteCount: count
          })
        } else {
          console.error('收藏数量获取失败:', res.result.error)
          this.setData({ favouriteCount: 0 })
        }
      } else {
        console.error('云函数返回无result字段')
        this.setData({ favouriteCount: 0 })
      }
    })
    .catch(err => {
      console.error('调用收藏云函数失败:', err)
      this.setData({ favouriteCount: 0 })
    })
  },

  // 获取评价数量
getCommentCount(openid) {
  console.log('调用评价数量云函数，openid:', openid)
  
  wx.cloud.callFunction({
    name: 'getmycomments',
    data: {
      type: 'getCount'
    }
  })
  .then(res => {
    console.log('评价数量云函数完整返回:', JSON.stringify(res, null, 2))
    
    if (res.result) {
      if (res.result.code === 0) {
        const count = res.result.data?.count || 0
        console.log('✅ 评价数量获取成功:', count)
        console.log('使用的查询字段:', res.result.data?.queryField)
        this.setData({
          commentCount: count
        })
      } else {
        console.error('❌ 评价数量获取失败:', res.result.msg)
        console.error('错误详情:', res.result)
        this.setData({ commentCount: 0 })
      }
    } else {
      console.error('❌ 云函数返回无result字段')
      console.error('完整响应:', res)
      this.setData({ commentCount: 0 })
    }
  })
  .catch(err => {
    console.error('❌ 调用评价云函数失败:', err)
    this.setData({ commentCount: 0 })
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
    if(this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/user/personalInfo/index' })
    } else {
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