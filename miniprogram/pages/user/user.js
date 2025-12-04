// pages/user/index.js
const db = wx.cloud.database()

Page({
  data: {
    active: 'user',
    // 登录态
    isLoggedIn: false,
    // 用户信息
    userAvatar: "",
    userNickname: "",
    defaultAvatar: "../../images/default-avatar.png",
    favouriteCount: 0,
    commentCount: 0,
    openid: "",
    showCommentCount: false,
    commentLoading: true  // 新增：评论数加载状态
  },

  onLoad() {
    console.log('=== 主页加载 ===')
    this.restoreLoginState()
  },
  
  onShow() {
    console.log('=== 主页显示 ===')
    this.restoreLoginState()
  },  
  
  // 检查登录状态
  restoreLoginState() {
    const userInfo = wx.getStorageSync("userInfo")
    const openid = wx.getStorageSync("openid")
    
    console.log('恢复登录状态:', {
      hasUserInfo: !!userInfo,
      hasOpenid: !!openid
    })
    
    // 未登录
    if (!userInfo || !openid) {
      console.log('用户未登录或信息不完整')
      this.setData({
        isLoggedIn: false,
        userAvatar: this.data.defaultAvatar,
        userNickname: "",
        favouriteCount: 0,
        commentCount: 0,
        showCommentCount: false,
        commentLoading: false
      })
      return
    }
    
    this.setData({ 
      openid,
      isLoggedIn: true,
      userAvatar: userInfo.avatarUrl || this.data.defaultAvatar,
      userNickname: userInfo.nickname || userInfo.nickName || "用户"
    })
    
    // 更新收藏数和评论数
    this.updateCounts(userInfo)
  },

  // 更新收藏数和评论数
  updateCounts(userInfo) {
    console.log('更新计数，用户信息:', userInfo)
    
    // 1. 先使用userInfo中的缓存值
    if (userInfo.commentCount !== undefined) {
      this.setData({ 
        commentCount: userInfo.commentCount,
        showCommentCount: true,
        commentLoading: false
      })
      console.log('使用缓存的评论数:', userInfo.commentCount)
    }
    
    if (userInfo.favouriteCount !== undefined) {
      this.setData({ favouriteCount: userInfo.favouriteCount })
      console.log('使用缓存的收藏数:', userInfo.favouriteCount)
    }
    
    // 2. 从数据库查询最新数据
    this.fetchCommentCount()
    this.fetchFavouriteCount()
  },
  
  // 查询评论数 - 优化版本
  fetchCommentCount() {
    if (!this.data.isLoggedIn) {
      console.log('用户未登录，跳过评论数查询')
      this.setData({ 
        commentCount: 0,
        showCommentCount: false,
        commentLoading: false
      })
      return
    }
    
    const openid = this.data.openid || wx.getStorageSync("openid")
    if (!openid) {
      console.log('无openid，跳过评论数查询')
      this.setData({ 
        commentCount: 0,
        showCommentCount: false,
        commentLoading: false
      })
      return
    }
    
    console.log('开始查询评论数，openid:', openid.substring(0, 10) + '...')
    
    this.setData({ commentLoading: true })
    
    // 方法1：使用云函数查询
    wx.cloud.callFunction({
      name: 'getMyCommentCount',
      data: {
        openid: openid
      }
    })
    .then(res => {
      console.log('云函数返回结果:', res)
      
      this.setData({ commentLoading: false })
      
      if (res.result && res.result.code === 0) {
        const count = res.result.data.count || 0
        
        console.log('查询成功，评论数:', count)
        
        this.setData({ 
          commentCount: count,
          showCommentCount: true
        })
        
        // 更新本地存储
        const userInfo = wx.getStorageSync("userInfo")
        if (userInfo) {
          userInfo.commentCount = count
          wx.setStorageSync("userInfo", userInfo)
          console.log('更新本地存储评论数:', count)
        }
      } else {
        console.error('云函数返回错误:', res.result?.msg || '未知错误')
        
        // 方法2：尝试直接查询数据库
        this.fetchCommentCountDirectly(openid)
      }
    })
    .catch(err => {
      console.error('云函数调用异常:', err)
      this.setData({ commentLoading: false })
      
      // 方法2：尝试直接查询数据库
      this.fetchCommentCountDirectly(openid)
    })
  },
  
  // 直接查询数据库
  fetchCommentCountDirectly(openid) {
    console.log('开始直接查询评论数')
    
    // 尝试使用不同的字段查询
    const tryQueries = [
      () => db.collection('comments').where({ _openid: openid }).count(),
      () => db.collection('comments').where({ userId: openid }).count(),
      () => db.collection('comments').where({ userid: openid }).count()
    ]
    
    this.tryQuerySequentially(tryQueries, 0, openid)
  },
  
  // 顺序尝试查询
  tryQuerySequentially(queries, index, openid) {
    if (index >= queries.length) {
      console.log('所有查询方式都失败，设置评论数为0')
      this.setData({ 
        commentCount: 0,
        showCommentCount: false,
        commentLoading: false
      })
      return
    }
    
    const queryFunc = queries[index]
    const fieldNames = ['_openid', 'userId', 'userid']
    const fieldName = fieldNames[index]
    
    console.log(`尝试使用 ${fieldName} 字段查询`)
    
    queryFunc()
      .then(res => {
        const count = res.total || 0
        console.log(`使用 ${fieldName} 查询成功，评论数:`, count)
        
        this.setData({ 
          commentCount: count,
          showCommentCount: true,
          commentLoading: false
        })
        
        // 更新本地存储
        const userInfo = wx.getStorageSync("userInfo")
        if (userInfo) {
          userInfo.commentCount = count
          wx.setStorageSync("userInfo", userInfo)
        }
      })
      .catch(err => {
        console.error(`使用 ${fieldName} 查询失败:`, err)
        // 尝试下一种查询方式
        this.tryQuerySequentially(queries, index + 1, openid)
      })
  },
  
  // 查询收藏数
  fetchFavouriteCount() {
    if (!this.data.isLoggedIn) {
      this.setData({ favouriteCount: 0 })
      return
    }
    
    const openid = this.data.openid || wx.getStorageSync("openid")
    if (!openid) {
      this.setData({ favouriteCount: 0 })
      return
    }
    
    console.log('开始查询收藏数')
    
    // 尝试不同的集合名和字段名
    const tryQueries = [
      () => db.collection('favourite').where({ userId: openid }).count(),
      () => db.collection('favourites').where({ _openid: openid }).count(),
      () => db.collection('favourites').where({ userId: openid }).count()
    ]
    
    this.tryFavouriteQuerySequentially(tryQueries, 0)
  },
  
  // 顺序尝试查询收藏
  tryFavouriteQuerySequentially(queries, index) {
    if (index >= queries.length) {
      console.log('所有收藏查询都失败，设置收藏数为0')
      this.setData({ favouriteCount: 0 })
      return
    }
    
    queries[index]()
      .then(res => {
        const count = res.total || 0
        console.log(`收藏查询成功，收藏数:`, count)
        this.setData({ favouriteCount: count })
        
        // 更新本地存储
        const userInfo = wx.getStorageSync("userInfo")
        if (userInfo) {
          userInfo.favouriteCount = count
          wx.setStorageSync("userInfo", userInfo)
        }
      })
      .catch(err => {
        console.error(`收藏查询方式 ${index} 失败:`, err)
        // 尝试下一种查询方式
        this.tryFavouriteQuerySequentially(queries, index + 1)
      })
  },

  // 其他原有方法保持不变...
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
    if (this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/user/collectDish/index' })
    } else {
      wx.navigateTo({
        url: '/pages/login/login',
      })
    }
  },
  
  goMyComment() {
    if (this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/user/myComment/index' })
    } else {
      wx.navigateTo({
        url: '/pages/login/login',
      })
    }
  },
  
  goAddDish() {
    if (this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/user/addDish/index' })
    } else {
      wx.navigateTo({
        url: '/pages/login/login',
      })
    }
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
  },
  
  // 手动刷新
  refreshData() {
    if (this.data.isLoggedIn) {
      console.log('手动刷新数据')
      this.fetchCommentCount()
      this.fetchFavouriteCount()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    }
  },
  
  // 调试函数
  checkCloudFunction() {
    console.log('=== 测试云函数 ===')
    
    wx.cloud.callFunction({
      name: 'getMyCommentCount',
      data: {}
    })
    .then(res => {
      console.log('云函数测试结果:', res)
      wx.showModal({
        title: '云函数测试',
        content: `code: ${res.result?.code}\nmsg: ${res.result?.msg}\ndata: ${JSON.stringify(res.result?.data)}`,
        showCancel: false
      })
    })
    .catch(err => {
      console.error('云函数测试失败:', err)
      wx.showToast({
        title: '云函数调用失败',
        icon: 'error'
      })
    })
  }
})