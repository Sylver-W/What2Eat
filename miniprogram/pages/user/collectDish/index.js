Page({
  data: {
    dishList: [],           // 收藏菜品列表
    isLoading: false,       // 初始加载状态
    isLoadingMore: false,   // 加载更多状态
    isRefreshing: false,    // 下拉刷新状态
    pageSize: 10,           // 每页数量
    pageIndex: 0,           // 当前页码
    hasMore: true,          // 是否还有更多数据
    totalCount: 0           // 总收藏数
  },

  onLoad() {
    this.loadCollectDishes(true);
    // 更新“我的”页面收藏数
    this.updateUserFavoriteCount();
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.dishList.length > 0) {
      this.refreshCollectList();
    }
  },


  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.refreshCollectList();
  },

  // 刷新收藏列表
  async refreshCollectList() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getcollectdishes',
        data: {
          pageIndex: 0,
          pageSize: this.data.dishList.length || this.data.pageSize
        }
      });

      if (result.result.code === 0) {
        this.setData({
          dishList: result.result.data.list || [],
          pageIndex: 0,
          hasMore: result.result.data.hasMore,
          totalCount: result.result.data.totalCount || 0,
          isRefreshing: false
        });
        
        // 更新“我的”页面收藏数
        this.updateUserFavoriteCount();
      } else {
        wx.showToast({
          title: result.result.msg || '刷新失败',
          icon: 'none'
        });
        this.setData({ isRefreshing: false });
      }
    } catch (error) {
      console.error('刷新收藏失败:', error);
      this.setData({ isRefreshing: false });
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 加载收藏菜品
  async loadCollectDishes(isInitial = false) {
    if ((isInitial && this.data.isLoading) || (!isInitial && (this.data.isLoadingMore || !this.data.hasMore))) {
      return;
    }

    if (isInitial) {
      wx.showLoading({ title: '加载中', mask: true });
      this.setData({ isLoading: true });
    } else {
      this.setData({ isLoadingMore: true });
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'getcollectdishes',
        data: {
          pageIndex: this.data.pageIndex,
          pageSize: this.data.pageSize
        }
      });

      wx.hideLoading();
      
      if (result.result.code === 0) {
        const newData = result.result.data;
        const newList = isInitial ? 
          (newData.list || []) : 
          [...this.data.dishList, ...(newData.list || [])];
        
        this.setData({
          dishList: newList,
          pageIndex: this.data.pageIndex + 1,
          hasMore: newData.hasMore,
          totalCount: newData.totalCount || 0,
          isLoading: false,
          isLoadingMore: false
        });

        // 更新“我的”页面收藏数
        this.updateUserFavoriteCount();
      } else {
        wx.showToast({
          title: result.result.msg || '加载失败',
          icon: 'none'
        });
        this.setData({ 
          isLoading: false, 
          isLoadingMore: false 
        });
      }
    } catch (error) {
      console.error('加载收藏菜品失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败，请检查网络',
        icon: 'none'
      });
      this.setData({ 
        isLoading: false, 
        isLoadingMore: false 
      });
    }
  },

  // 加载更多
  loadMore() {
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
        
        // 更新本地缓存，确保“我的”页面数据同步
        wx.setStorageSync('favouriteCount', this.data.totalCount);
      }
    } catch (error) {
      console.error('更新用户收藏计数失败:', error);
    }
  },

  // 跳转到菜品详情
  goDishDetail(e) {
    const dishId = e.currentTarget.dataset.dishId;
    if (!dishId) return;
    
    wx.navigateTo({
      url: `/pages/dishDetail/index?dishId=${dishId}`
    });
  },

  // 取消收藏
  cancelCollect(e) {
    const dishId = e.currentTarget.dataset.dishId;
    if (!dishId) return;
    
    wx.showModal({
      title: '取消收藏',
      content: '确定不再收藏这个菜品了吗？',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          await this.removeCollect(dishId);
        }
      }
    });
  },

  // 移除收藏
  async removeCollect(dishId) {
    wx.showLoading({ title: '处理中', mask: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'removecollect',
        data: { dishId }
      });

      wx.hideLoading();
      
      if (result.result.code === 0) {
        // 从列表中移除
        const newList = this.data.dishList.filter(item => item.dishId !== dishId);
        this.setData({
          dishList: newList,
          totalCount: Math.max(0, this.data.totalCount - 1)
        });
        
        // 更新“我的”页面收藏数
        this.updateUserFavoriteCount();
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.result.msg || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('取消收藏失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 去首页
  goToHome() {
    wx.navigateTo({ url: '/pages/index/index' });
  }
});
