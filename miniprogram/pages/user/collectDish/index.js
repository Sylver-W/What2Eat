const db = wx.cloud.database()
Page({
  data: {
    loading: true,
    favouriteList: [], // 收藏列表
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.checkLoginAndLoadFavourites()
  },

  onShow() {
    this.checkLoginAndLoadFavourites()
  },

  // 检查登录并加载收藏
  checkLoginAndLoadFavourites() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录查看收藏',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }
    
    this.userId = userInfo.openid || userInfo._id
    this.loadFavourites(1)
  },

  // 加载收藏列表
  async loadFavourites(page = 1) {
    if (this.data.loading && page !== 1) return
    
    this.setData({ loading: true })
    
    try {
      const skipCount = (page - 1) * this.data.pageSize
      
      // 查询用户的收藏记录
      const result = await db.collection('favourite')
        .where({
          userId: this.userId
        })
        .orderBy('createTime', 'desc')
        .skip(skipCount)
        .limit(this.data.pageSize)
        .get()
      
      // 获取总数
      const countResult = await db.collection('favourite')
        .where({ userId: this.userId })
        .count()
      
      const favourites = result.data || []
      
      // 处理图片URL（如果收藏中没有保存图片URL，需要从菜品表中获取）
      const processedFavourites = await this.processFavouriteImages(favourites)
      
      this.setData({
        favouriteList: page === 1 ? processedFavourites : [...this.data.favouriteList, ...processedFavourites],
        totalCount: countResult.total,
        currentPage: page,
        hasMore: favourites.length === this.data.pageSize,
        loading: false
      })
      
    } catch (error) {
      console.error('加载收藏失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 处理收藏中的图片URL
  async processFavouriteImages(favourites) {
    if (!favourites || favourites.length === 0) return favourites
    
    // 如果收藏中已经保存了菜品图片，直接使用
    // 如果没有，可以从菜品表中获取
    return favourites.map(item => {
      // 如果没有菜品图片URL，尝试从菜品表中获取
      if (!item.dishImage) {
        // 这里可以添加从菜品表获取图片的逻辑
        item.dishImage = '/images/dish1.jpg'
      }
      
      return {
        id: item._id,
        dishId: item.dishId,
        dishName: item.dishName || '未知菜品',
        dishImage: item.dishImage,
        dishPrice: item.dishPrice || 0,
        dishRating: item.dishRating || 4.0,
        dishLocation: item.dishLocation || '未知食堂',
        dishDescription: item.dishDescription || '暂无描述',
        createTime: item.createTime,
        // 用户信息
        userNickname: item.userNickname || '用户',
        userAvatar: item.userAvatar || '/images/default-avatar.png'
      }
    })
  },

  // 跳转到菜品详情
  goDishDetail(e) {
    const dishId = e.currentTarget.dataset.id
    const favouriteId = e.currentTarget.dataset.favouriteid
    
    if (dishId) {
      wx.navigateTo({
        url: `/pages/dishDetail/index?id=${dishId}`
      })
    }
  },

  // 取消收藏
  async onCancelFavourite(e) {
    const favouriteId = e.currentTarget.dataset.id
    const dishId = e.currentTarget.dataset.dishid
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 删除收藏记录
            await db.collection('favourite').doc(favouriteId).remove()
            
            // 更新菜品收藏数
            await db.collection('dishes').doc(dishId).update({
              data: {
                favourCount: wx.cloud.database().command.inc(-1)
              }
            })
            
            // 从列表中移除
            const favouriteList = this.data.favouriteList
            favouriteList.splice(index, 1)
            
            this.setData({
              favouriteList: [...favouriteList],
              totalCount: this.data.totalCount - 1
            })
            
            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            })
            
          } catch (error) {
            console.error('取消收藏失败:', error)
            wx.showToast({
              title: '操作失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadFavourites(1)
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    
    const nextPage = this.data.currentPage + 1
    this.loadFavourites(nextPage)
  }
})