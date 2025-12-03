// pages/dishDetail/index.js
Page({
  data: {
    dish: {}, // 菜品信息
    comments: [], // 评论列表
    totalComments: 0, // 总评论数
    currentPage: 1, // 当前评论页码
    pageSize: 10, // 每页评论数
    hasMoreComments: false, // 是否有更多评论
    loading: true, // 加载状态
    
    // 评论弹窗相关
    showCommentPopup: false,
    newComment: {
      rating: 5, // 默认5星
      content: '',
      images: []
    },
    isSubmitting: false, // 是否正在提交
  },

  onLoad(options) {
    // 接收从搜索页面传递的参数
    const { id, dishId } = options
    this.dishId = id || dishId
    
    if (this.dishId) {
      this.loadDishDetail()
    } else {
      wx.showToast({
        title: '菜品不存在',
        icon: 'error'
      })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  /**
   * 加载菜品详情
   */
  async loadDishDetail(page = 1) {
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database();
      
      // 1. 获取菜品信息
      const dishResult = await db.collection('dishes').doc(this.dishId).get();
  
      if (!dishResult.data) {
        throw new Error('菜品不存在');
      }

      const dish = dishResult.data;
      
      // 2. 获取评论
      let commentList = [];
      let totalCount = 0;
      
      try {
        const commentsResult = await db.collection('comments')
          .where({ dishId: dish.dishId }) // 注意：使用 dishId 而不是 _id
          .orderBy('createTime', 'desc')
          .skip((page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get();
        commentList = commentsResult.data || [];
        
        const countResult = await db.collection('comments')
          .where({ dishId: dish.dishId })
          .count();
        totalCount = countResult.total;
      } catch (commentError) {
        console.warn('获取评论失败:', commentError);
      }

      // 3. 使用云函数批量处理图片
      const processedData = await this.processImagesWithCloudFunction([dish], commentList);
      const processedDish = processedData.dishes[0] || dish;
      const processedComments = processedData.comments || commentList;

      console.log('菜品处理后的图片URL:', processedDish.imageUrl);
      console.log('评论处理结果:', processedComments);

      // 4. 更新页面数据
      this.setData({
        dish: {
          ...processedDish,
          _id: dish._id,
          dishId: dish.dishId || 0,
          name: dish.name || '未知菜品',
          description: dish.description || '暂无描述',
          price: dish.price || 0,
          location: dish.canteenName || '未知食堂',
          rating: dish.rating || 4.0,
          ratingCount: dish.ratingCount || 0,
          imageUrl: processedDish.imageUrl || '/images/dish1.jpg',
          tags: this.formatTags(dish.tags || [])
        },
        comments: page === 1 ? processedComments : [...this.data.comments, ...processedComments],
        totalComments: totalCount,
        currentPage: page,
        hasMoreComments: commentList.length === this.data.pageSize,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: dish.name || '菜品详情'
      });

    } catch (error) {
      console.error('加载菜品详情失败:', error);
      this.setData({ 
        loading: false,
        dish: {
          name: '加载失败',
          description: '请稍后重试',
          imageUrl: '/images/dish1.jpg'
        }
      });
      wx.showToast({
        title: '加载失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 使用云函数处理图片（菜品和评论）
   */
  async processImagesWithCloudFunction(dishes = [], comments = []) {
    if ((!dishes || dishes.length === 0) && (!comments || comments.length === 0)) {
      return {
        dishes: dishes.map(dish => ({
          ...dish,
          imageUrl: '/images/dish1.jpg'
        })),
        comments: comments.map(comment => ({
          ...comment,
          userAvatar: '/images/default-avatar.png'
        }))
      };
    }

    try {
      // 调用云函数处理图片
      const result = await wx.cloud.callFunction({
        name: 'getCommentsImages',
        data: {
          dishes: dishes,
          comments: comments
        }
      });

      if (result.result && result.result.success) {
        console.log('云函数处理成功');
        return result.result.data;
      } else {
        console.warn('云函数返回失败:', result.result?.error);
        // 返回默认处理结果
        return {
          dishes: dishes.map(dish => ({
            ...dish,
            imageUrl: (dish.images && dish.images[0]) || '/images/dish1.jpg'
          })),
          comments: comments.map(comment => ({
            ...comment,
            userAvatar: comment.userAvatar || '/images/default-avatar.png'
          }))
        };
      }
    } catch (error) {
      console.error('调用云函数失败:', error);
      // 降级处理：直接返回原始数据
      return {
        dishes: dishes.map(dish => ({
          ...dish,
          imageUrl: (dish.images && dish.images[0]) || '/images/dish1.jpg'
        })),
        comments: comments.map(comment => ({
          ...comment,
          userAvatar: comment.userAvatar || '/images/default-avatar.png'
        }))
      };
    }
  },

  /**
   * 格式化标签
   */
  formatTags(tags) {
    if (!tags) return []
    if (Array.isArray(tags)) return tags
    if (typeof tags === 'string') {
      try {
        return JSON.parse(tags)
      } catch {
        return tags.split(',')
      }
    }
    return []
  },

  /**
   * 格式化时间显示
   */
  formatTime(dateString) {
    if (!dateString) return ''
    
    // 处理云数据库的日期格式
    let date;
    if (dateString.$date) {
      // MongoDB日期格式
      date = new Date(dateString.$date);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
      return '刚刚';
    } else if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}-${day}`;
    }
  },

  /**
   * 图片预览
   */
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    if (url && url !== '/images/dish1.jpg' && url !== '/images/default-avatar.png') {
      wx.previewImage({
        urls: [url],
        current: url
      })
    }
  },

  /**
   * 打开发表评论弹窗
   */
  onAddComment() {
    // 检查用户是否登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录后发表评价',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user/login/index'
            })
          }
        }
      })
      return;
    }

    this.setData({
      showCommentPopup: true,
      newComment: {
        rating: 5,
        content: '',
        images: []
      }
    })
  },

  /**
   * 关闭弹窗
   */
  onClosePopup() {
    this.setData({
      showCommentPopup: false
    })
  },

  /**
   * 评分变化
   */
  onRatingChange(e) {
    this.setData({
      'newComment.rating': e.detail
    })
  },

  /**
   * 内容变化
   */
  onContentChange(e) {
    this.setData({
      'newComment.content': e.detail.value
    })
  },

  /**
   * 提交评论（真实提交到数据库）
   */
  async onSubmitComment() {
    const { rating, content } = this.data.newComment;
    const userInfo = wx.getStorageSync('userInfo');
    const dish = this.data.dish;
    
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return;
    }

    if (!rating) {
      wx.showToast({ title: '请选择评分', icon: 'none' })
      return;
    }

    if (!content.trim()) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return;
    }

    if (content.trim().length < 5) {
      wx.showToast({ title: '评论内容至少5个字', icon: 'none' })
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const now = new Date();

      // 1. 创建评论
      const commentData = {
        dishId: dish.dishId,
        dishName: dish.name,
        canteenId: dish.canteenId,
        canteenName: dish.location,
        userId: userInfo.openid || 'user_' + Date.now(),
        userAvatar: userInfo.avatarUrl || '',
        userNickname: userInfo.nickName || '匿名用户',
        rating: rating,
        content: content.trim(),
        images: [],
        likeCount: 0,
        createTime: now,
        updateTime: now
      };

      const commentResult = await db.collection('comments').add({
        data: commentData
      });

      console.log('评论添加成功:', commentResult);

      // 2. 更新菜品的评价统计
      const newRatingCount = (dish.ratingCount || 0) + 1;
      const newRating = ((dish.rating || 0) * (dish.ratingCount || 0) + rating) / newRatingCount;

      await db.collection('dishes').doc(dish._id).update({
        data: {
          rating: newRating,
          ratingCount: newRatingCount
        }
      });

      // 3. 显示成功提示
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });

      // 4. 关闭弹窗并刷新数据
      this.setData({
        showCommentPopup: false,
        isSubmitting: false
      });

      // 5. 刷新菜品详情和评论列表
      this.loadDishDetail(1);

    } catch (error) {
      console.error('提交评论失败:', error);
      wx.showToast({
        title: '评价失败，请重试',
        icon: 'error'
      });
      this.setData({ isSubmitting: false });
    }
  },

  /**
   * 加载更多评论
   */
  loadMoreComments() {
    if (!this.data.hasMoreComments || this.data.loading) return
    
    const nextPage = this.data.currentPage + 1
    this.loadDishDetail(nextPage)
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadDishDetail(1)
    wx.stopPullDownRefresh()
  },

  /**
   * 图片加载失败处理
   */
  onImageError(e) {
    console.log('图片加载失败:', e);
    const type = e.currentTarget.dataset.type;
    const index = e.currentTarget.dataset.index;
    
    if (type === 'dish') {
      this.setData({
        'dish.imageUrl': '/images/dish1.jpg'
      });
    } else if (type === 'comment' && index !== undefined) {
      const comments = this.data.comments;
      comments[index].userAvatar = '/images/default-avatar.png';
      this.setData({ comments });
    }
  },

  /**
   * 图片加载成功
   */
  onImageLoad(e) {
    console.log('图片加载成功');
  },

  /**
   * 点赞评论
   */
  async onLikeComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      const db = wx.cloud.database();
      const comment = this.data.comments[index];
      
      // 更新点赞数
      await db.collection('comments').doc(commentId).update({
        data: {
          likeCount: (comment.likeCount || 0) + 1
        }
      });

      // 更新本地数据
      const comments = this.data.comments;
      comments[index].likeCount = (comments[index].likeCount || 0) + 1;
      this.setData({ comments });

      wx.showToast({
        title: '点赞成功',
        icon: 'success'
      });

    } catch (error) {
      console.error('点赞失败:', error);
      wx.showToast({
        title: '点赞失败',
        icon: 'none'
      });
    }
  },

  onReady() {},
  onShow() {},
  onHide() {},
  onUnload() {},
  onShareAppMessage() {
    return {
      title: this.data.dish?.name || '菜品详情',
      path: `/pages/dishDetail/index?id=${this.dishId}`
    }
  }
});