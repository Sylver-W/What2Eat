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
    // 更新"我的"页面收藏数
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
        const dishList = this.processDishList(result.result.data.list || []);
        
        this.setData({
          dishList: dishList,
          pageIndex: 0,
          hasMore: result.result.data.hasMore,
          totalCount: result.result.data.totalCount || 0,
          isRefreshing: false
        });
        
        // 更新"我的"页面收藏数
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
    } finally {
      wx.stopPullDownRefresh();
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
          this.processDishList(newData.list || []) : 
          [...this.data.dishList, ...this.processDishList(newData.list || [])];
        
        this.setData({
          dishList: newList,
          pageIndex: this.data.pageIndex + 1,
          hasMore: newData.hasMore,
          totalCount: newData.totalCount || 0,
          isLoading: false,
          isLoadingMore: false
        });

        // 更新"我的"页面收藏数
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

  // 处理菜品列表数据
  processDishList(dishList) {
    if (!dishList || !Array.isArray(dishList)) {
      return [];
    }
    
    return dishList.map(item => {
      // 计算价格格式化
      const price = item.dishPrice || item.price || 0;
      const formattedPrice = price.toFixed(2);
      
      // 计算评分格式化
      const rating = item.dishRating || item.rating || 0;
      const formattedRating = rating.toFixed(1);
      
      // 处理标签
      const rawTags = item.dishTags || item.tags || [];
      const displayTags = Array.isArray(rawTags) ? rawTags.slice(0, 3) : [];
      
      // 处理描述
      const description = item.dishDescription || item.description || '';
      const shortDescription = description.length > 30 ? 
        description.substring(0, 30) + '...' : description;
      
      return {
        ...item,
        _id: item._id || item.dishId,
        dishId: item.dishId || item._id,
        dishName: item.dishName || item.name || '未知菜品',
        dishPrice: price,
        formattedPrice: formattedPrice,
        dishRating: rating,
        formattedRating: formattedRating,
        favourCount: item.favourCount || 0,
        canteenName: item.canteenName || item.location || '未知食堂',
        dishImage: item.dishImage || (item.images && item.images[0]) || '',
        dishDescription: description,
        shortDescription: shortDescription,
        dishTags: displayTags, // 只保留前3个标签
        rawTags: rawTags // 保留原始标签
      };
    });
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
        
        // 更新本地缓存，确保"我的"页面数据同步
        wx.setStorageSync('favouriteCount', this.data.totalCount);
      }
    } catch (error) {
      console.error('更新用户收藏计数失败:', error);
    }
  },

  // 跳转到菜品详情
  goDishDetail(e) {
    const dish = e.currentTarget.dataset.dish;
    if (!dish) return;
    
    console.log('跳转到菜品详情:', dish);
    
    // 优先使用数据库 _id，如果没有则使用业务 dishId
    const dishDbId = dish._id;
    const dishBusinessId = dish.dishId;
    
    if (dishDbId && (dishDbId.startsWith('dish') || dishDbId.length > 5)) {
      // 使用数据库 _id
      wx.navigateTo({
        url: `/pages/dishDetail/index?id=${dishDbId}`
      });
    } else if (dishBusinessId) {
      // 使用业务 dishId
      wx.navigateTo({
        url: `/pages/dishDetail/index?dishId=${dishBusinessId}`
      });
    } else {
      wx.showToast({
        title: '菜品信息错误',
        icon: 'none'
      });
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
    
    // 阻止事件冒泡，避免触发跳转
    e.stopPropagation();
  },

  // 移除收藏
  async removeCollect(dish) {
    const dishId = dish.dishId || dish._id;
    if (!dishId) return;
    
    wx.showLoading({ title: '处理中', mask: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'removecollect',
        data: { dishId }
      });

      wx.hideLoading();
      
      if (result.result.code === 0) {
        // 从列表中移除
        const newList = this.data.dishList.filter(item => 
          (item.dishId !== dishId && item._id !== dishId)
        );
        this.setData({
          dishList: newList,
          totalCount: Math.max(0, this.data.totalCount - 1)
        });
        
        // 更新"我的"页面收藏数
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
    wx.switchTab({ url: '/pages/index/index' });
  }
});