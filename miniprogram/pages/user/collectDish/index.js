const db = wx.cloud.database()
Page({
  data: {
<<<<<<< HEAD
    dishList: [],           // 收藏菜品列表
    isLoading: false,       // 初始加载状态
    isLoadingMore: false,   // 加载更多状态
    isRefreshing: false,    // 下拉刷新状态
    hasMore: true,          // 是否还有更多数据
    totalCount: 0           // 总收藏数
=======
    loading: true,
    favouriteList: [], // 收藏列表
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    hasMore: true
>>>>>>> 5540f803862a52f8773db1c464097e6c0d166d16
  },

  onLoad() {
    console.log('收藏页面加载');
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录后查看收藏',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    this.loadCollectDishes();
  },

  onShow() {
<<<<<<< HEAD
    // 页面显示时刷新数据
    this.refreshCollectList();
=======
    this.checkLoginAndLoadFavourites()
>>>>>>> 5540f803862a52f8773db1c464097e6c0d166d16
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.refreshCollectList();
  },

  // 刷新收藏列表
  async refreshCollectList() {
    console.log('刷新收藏列表');
    try {
      const result = await wx.cloud.callFunction({
        name: 'getcollectdishes',
        data: {
          pageIndex: 0,
          pageSize: 10
        }
      });

      console.log('收藏数据:', result);

      if (result.result && result.result.code === 0) {
        const dishList = this.formatDishList(result.result.data.list || []);
        
        this.setData({
          dishList: dishList,
          hasMore: result.result.data.hasMore || false,
          totalCount: result.result.data.totalCount || 0,
          isRefreshing: false
        });
      } else {
        wx.showToast({
          title: result.result?.msg || '加载失败',
          icon: 'none'
        });
        this.setData({ isRefreshing: false });
      }
    } catch (error) {
      console.error('刷新失败:', error);
      this.setData({ isRefreshing: false });
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    } finally {
      wx.stopPullDownRefresh();
    }
    
    this.userId = userInfo.openid || userInfo._id
    this.loadFavourites(1)
  },

<<<<<<< HEAD
  // 加载收藏菜品
  async loadCollectDishes() {
    if (this.data.isLoading || this.data.isLoadingMore) return;
    
    this.setData({ isLoading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getcollectdishes',
        data: {
          pageIndex: 0,
          pageSize: 20
        }
      });
=======
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
>>>>>>> 5540f803862a52f8773db1c464097e6c0d166d16
      
      console.log('加载收藏菜品结果:', result);
      
      if (result.result && result.result.code === 0) {
        const dishList = this.formatDishList(result.result.data.list || []);
        
        this.setData({
          dishList: dishList,
          hasMore: result.result.data.hasMore || false,
          totalCount: result.result.data.totalCount || 0,
          isLoading: false
        });
      } else {
        wx.showToast({
          title: result.result?.msg || '加载失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    } catch (error) {
<<<<<<< HEAD
      console.error('加载失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
=======
      console.error('加载收藏失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
>>>>>>> 5540f803862a52f8773db1c464097e6c0d166d16
    }
  },

  // 格式化菜品列表
  formatDishList(dishList) {
    return dishList.map(item => {
      // 确保所有必要字段都有值
      const price = item.dishPrice || item.price || 0;
      const rating = item.dishRating || item.rating || 0;
      const tags = item.dishTags || item.tags || [];
      
      return {
        _id: item._id || item.dishId,
        dishId: item.dishId, // 保持原始格式（字符串或数字）
        dishName: item.dishName || item.name || '未知菜品',
        dishPrice: price,
        formattedPrice: price.toFixed(2),
        dishRating: rating,
        formattedRating: rating.toFixed(1),
        dishDescription: item.dishDescription || item.description || '',
        shortDescription: (item.dishDescription || item.description || '').substring(0, 30) + '...',
        dishImage: item.dishImage || (item.images && item.images[0]) || '/images/default-dish.jpg',
        dishTags: tags,
        canteenName: item.canteenName || item.dishLocation || item.location || '未知食堂',
        favourCount: item.favourCount || 0,
        ratingCount: item.ratingCount || 0
      };
    });
  },

  // 加载更多
  loadMore() {
<<<<<<< HEAD
    // 由于云函数不支持分页，这里不实现加载更多
    // 可以一次性加载所有数据，或者修改云函数支持分页
=======
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.loadCollectDishes(false);
    }
  },

  // 更新用户收藏计数
  async updateUserFavoriteCount() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        userInfo.favouriteCount = this.data.totalCount;
        wx.setStorageSync('userInfo', userInfo);
        
        // 更新本地缓存，确保"我的"页面数据同步
        wx.setStorageSync('favouriteCount', this.data.totalCount);
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
>>>>>>> 5540f803862a52f8773db1c464097e6c0d166d16
  },

  // 跳转到菜品详情
  goDishDetail(e) {
    const dish = e.currentTarget.dataset.dish;
    if (!dish) return;
    
    console.log('跳转到菜品详情:', dish);
    
    // dishId 可能是 "dish001" 或 1001
    // 优先使用数据库 _id
    if (dish._id) {
      wx.navigateTo({
        url: `/pages/dishDetail/index?id=${dish._id}`
      });
    } else if (dish.dishId) {
      // 判断是字符串格式还是数字格式
      if (typeof dish.dishId === 'string' && dish.dishId.startsWith('dish')) {
        wx.navigateTo({
          url: `/pages/dishDetail/index?dishId=${dish.dishId.replace('dish', '')}`
        });
      } else {
        wx.navigateTo({
          url: `/pages/dishDetail/index?dishId=${dish.dishId}`
        });
      }
    }
  },

  // 取消收藏
  cancelCollect(e) {
    const dish = e.currentTarget.dataset.dish;
    if (!dish) return;
    
    wx.showModal({
      title: '取消收藏',
      content: `确定不再收藏《${dish.dishName}》了吗？`,
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          await this.removeCollect(dish);
        }
      }
    });
    
    e.stopPropagation();
  },

  // 移除收藏
  async removeCollect(dish) {
    const dishId = dish.dishId;
    if (!dishId) return;
    
    wx.showLoading({ title: '处理中' });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'removecollect',
        data: { dishId }
      });

      wx.hideLoading();
      
      if (result.result && result.result.code === 0) {
        // 从列表中移除
        const newList = this.data.dishList.filter(item => item.dishId !== dishId);
        this.setData({
          dishList: newList,
          totalCount: Math.max(0, this.data.totalCount - 1)
        });
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.result?.msg || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('取消收藏失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 去首页
  goToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
