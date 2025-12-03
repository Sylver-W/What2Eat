Page({
  data: {
    commentList: [],        // 评价列表
    isLoading: false,       // 初始加载状态
    isLoadingMore: false,   // 加载更多状态
    isRefreshing: false,    // 下拉刷新状态
    pageSize: 10,           // 每页数量
    pageIndex: 0,           // 当前页码
    hasMore: true,          // 是否还有更多数据
    totalCount: 0           // 总评价数
  },

  onLoad() {
    this.loadMyComments(true);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.commentList.length > 0) {
      this.refreshCommentList();
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.refreshCommentList();
  },

  // 刷新评价列表
  async refreshCommentList() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getmycomments',
        data: {
          pageIndex: 0,
          pageSize: this.data.commentList.length || this.data.pageSize
        }
      });

      if (result.result.code === 0) {
        const comments = this.processComments(result.result.data.list || []);
        this.setData({
          commentList: comments,
          pageIndex: 0,
          hasMore: result.result.data.hasMore,
          totalCount: result.result.data.totalCount || 0,
          isRefreshing: false
        });
        
        // 停止下拉刷新动画
        wx.stopPullDownRefresh();
        
        // 更新“我的”页面评价数
        this.updateUserCommentCount();
      } else {
        wx.showToast({
          title: result.result.msg || '刷新失败',
          icon: 'none'
        });
        this.setData({ isRefreshing: false });
        wx.stopPullDownRefresh();
      }
    } catch (error) {
      console.error('刷新评价失败:', error);
      this.setData({ isRefreshing: false });
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 加载我的评价
  async loadMyComments(isInitial = false) {
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
        name: 'getmycomments',
        data: {
          pageIndex: this.data.pageIndex,
          pageSize: this.data.pageSize
        }
      });

      wx.hideLoading();
      
      if (result.result.code === 0) {
        const newData = result.result.data;
        const processedComments = this.processComments(newData.list || []);
        
        const newList = isInitial ? 
          processedComments : 
          [...this.data.commentList, ...processedComments];
        
        this.setData({
          commentList: newList,
          pageIndex: this.data.pageIndex + 1,
          hasMore: newData.hasMore,
          totalCount: newData.totalCount || 0,
          isLoading: false,
          isLoadingMore: false
        });

        // 更新“我的”页面评价数
        this.updateUserCommentCount();
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
      console.error('加载评价失败:', error);
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

  // 处理评论数据
  processComments(comments) {
    return comments.map(comment => {
      // 处理时间格式
      if (comment.createTime && typeof comment.createTime === 'object') {
        comment.createTime = this.formatTime(comment.createTime);
      }
      
      // 确保images是数组
      if (!Array.isArray(comment.images)) {
        comment.images = comment.images ? [comment.images] : [];
      }
      
      // 确保likeCount有值
      comment.likeCount = comment.likeCount || 0;
      
      return comment;
    });
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.loadMyComments(false);
    }
  },

  // 更新时间格式
  formatTime(time) {
    if (!time) return '未知时间';
    
    try {
      // 如果是对象（云数据库时间）
      if (typeof time === 'object' && time.constructor.name === 'Date') {
        const date = time;
        const now = new Date();
        const diff = now - date;
        
        // 如果是今天
        if (date.toDateString() === now.toDateString()) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
          return '昨天';
        }
        
        // 其他情况
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day}`;
      }
      
      // 如果是字符串
      if (typeof time === 'string') {
        const date = new Date(time);
        if (!isNaN(date.getTime())) {
          return this.formatTime(date);
        }
      }
      
      return '未知时间';
    } catch (error) {
      return '未知时间';
    }
  },

  // 更新用户评价计数
  async updateUserCommentCount() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        userInfo.commentCount = this.data.totalCount;
        wx.setStorageSync('userInfo', userInfo);
        
        // 更新本地缓存
        wx.setStorageSync('commentCount', this.data.totalCount);
      }
    } catch (error) {
      console.error('更新用户评价计数失败:', error);
    }
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = e.currentTarget.dataset.images;
    
    if (Array.isArray(images) && images.length > 0) {
      wx.previewImage({
        current: images[index],
        urls: images
      });
    }
  },

  // 编辑评价
  editComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到编辑页面
    // wx.navigateTo({
    //   url: `/pages/editComment/index?commentId=${commentId}`
    // });
  },

  // 删除评价
  deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const comment = this.data.commentList.find(c => c.commentId === commentId);
    
    if (!comment) return;
    
    wx.showModal({
      title: '删除评价',
      content: '确定要删除这条评价吗？删除后不可恢复。',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          await this.removeComment(commentId, comment.dishId);
        }
      }
    });
  },

  // 移除评价
  async removeComment(commentId, dishId) {
    wx.showLoading({ title: '删除中', mask: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deletecomment',
        data: { 
          commentId,
          dishId  // 需要dishId来更新菜品评分
        }
      });

      wx.hideLoading();
      
      if (result.result.code === 0) {
        // 从列表中移除
        const newList = this.data.commentList.filter(item => item.commentId !== commentId);
        this.setData({
          commentList: newList,
          totalCount: Math.max(0, this.data.totalCount - 1)
        });
        
        // 更新“我的”页面评价数
        this.updateUserCommentCount();
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.result.msg || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('删除评价失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      });
    }
  },

  // 去食堂
  goToCanteen() {
    wx.switchTab({
      url: '/pages/canteen/canteen'
    });
  }
});