Page({
  data: {
    dishList: [],           // 收藏菜品列表
    isLoading: false,       // 初始加载状态
    isLoadingMore: false,   // 加载更多状态
    isRefreshing: false,    // 下拉刷新状态
    hasMore: true,          // 是否还有更多数据
    totalCount: 0           // 总收藏数
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
    // 页面显示时刷新数据
    this.refreshCollectList();
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
  },

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
      console.error('加载失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
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
    // 由于云函数不支持分页，这里不实现加载更多
    // 可以一次性加载所有数据，或者修改云函数支持分页
  },

  // 跳转到菜品详情
  goDishDetail(e) {
    const dishId = e.currentTarget.dataset.id
    const favouriteId = e.currentTarget.dataset.favouriteid
    
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

  // 上拉加载更多
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    
    const nextPage = this.data.currentPage + 1
    this.loadFavourites(nextPage)
  }
});
