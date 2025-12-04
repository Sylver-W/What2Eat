Page({
  data: {
    dish: {}, // 菜品信息
    comments: [], // 评论列表
    totalComments: 0, // 总评论数
    currentPage: 1, // 当前评论页码
    pageSize: 10, // 每页评论数
    hasMoreComments: false, // 是否有更多评论
    loading: true, // 加载状态
    
    // 新增：用户状态
    isFavourite: false, // 是否已收藏
    userLikedComments: {}, // 用户点赞过的评论 {commentId: true}
    
    // 评论弹窗相关
    showCommentPopup: false,
    newComment: {
      rating: 5, // 默认5星
      content: '',
      images: []
    },
    isSubmitting: false, // 是否正在提交
    
    // 新增：原始参数存储
    originalId: '',
    originalDishId: '',
  },

  onLoad(options) {
    console.log('=== dishDetail onLoad ===', options);
    
    // 接收从搜索页面传递的参数
    const { id, dishId } = options;
    
    // 存储原始参数
    this.originalId = id;
    this.originalDishId = dishId;
    
    // 判断参数类型
    if (id && (id.startsWith('dish') || id.length > 5)) {
      // id 看起来是数据库的 _id（如 "dish001"）
      this.dishDbId = id;
      this.dishBusinessId = null;
      console.log('使用数据库_id:', this.dishDbId);
    } else if (dishId) {
      // dishId 是业务ID（如 1001）
      this.dishDbId = null;
      this.dishBusinessId = dishId;
      console.log('使用业务dishId:', this.dishBusinessId);
    } else if (id) {
      // id 可能是业务ID
      this.dishDbId = null;
      this.dishBusinessId = id;
      console.log('id作为业务dishId:', this.dishBusinessId);
    }
    
    if (this.dishDbId || this.dishBusinessId) {
      this.loadDishDetail();
    } else {
      wx.showToast({
        title: '菜品不存在',
        icon: 'error'
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onShow() {
    // 页面显示时检查用户收藏状态
    this.checkUserFavourite()
  },

  /**
   * 加载菜品详情
   */
  async loadDishDetail(page = 1) {
    console.log('=== 加载菜品详情 ===', {
      page: page,
      dishDbId: this.dishDbId,
      dishBusinessId: this.dishBusinessId
    });
    
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database();
      let dish = null;
      
      // 1. 获取菜品信息 - 根据不同的ID类型查询
      if (this.dishDbId) {
        // 直接使用数据库 _id 查询
        console.log('使用数据库_id查询:', this.dishDbId);
        const dishResult = await db.collection('dishes').doc(this.dishDbId).get();
        if (!dishResult.data) {
          throw new Error('菜品不存在');
        }
        dish = dishResult.data;
      } else if (this.dishBusinessId) {
        // 使用业务 dishId 查询
        console.log('使用业务dishId查询:', this.dishBusinessId);
        const dishResult = await db.collection('dishes')
          .where({
            dishId: Number(this.dishBusinessId) || this.dishBusinessId
          })
          .get();
        
        if (!dishResult.data || dishResult.data.length === 0) {
          throw new Error('菜品不存在');
        }
        
        dish = dishResult.data[0];
        // 保存数据库 _id 供后续使用
        this.dishDbId = dish._id;
        console.log('查询到菜品，数据库_id:', this.dishDbId);
      }
      
      if (!dish) {
        throw new Error('菜品不存在');
      }
      
      console.log('获取到菜品信息:', {
        _id: dish._id,
        dishId: dish.dishId,
        name: dish.name
      });
      
      // 2. 获取评论
      let commentList = [];
      let totalCount = 0;
      
      try {
        const commentsResult = await db.collection('comments')
          .where({ dishId: dish.dishId })
          .orderBy('createTime', 'desc')
          .skip((page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get();
        commentList = commentsResult.data || [];
        
        const countResult = await db.collection('comments')
          .where({ dishId: dish.dishId })
          .count();
        totalCount = countResult.total;
        
        console.log('获取到评论:', commentList.length, '条，总计:', totalCount);
      } catch (commentError) {
        console.warn('获取评论失败:', commentError);
      }

      // 3. 加载用户点赞记录
      await this.loadUserLikedComments(dish.dishId);
      
      // 4. 获取每个评论的实际点赞数（从like数据库统计）
      if (commentList.length > 0) {
        commentList = await this.loadCommentsLikeCounts(commentList);
      }

      // 5. 使用云函数批量处理图片
      const processedData = await this.processImagesWithCloudFunction([dish], commentList);
      const processedDish = processedData.dishes[0] || dish;
      const processedComments = processedData.comments || commentList;

      // 6. 更新页面数据
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
          tags: this.formatTags(dish.tags || []),
          favourCount: dish.favourCount || 0
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
        title: '加载失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 加载每个评论的实际点赞数
   */
  async loadCommentsLikeCounts(comments) {
    try {
      const db = wx.cloud.database();
      const commentIds = comments.map(comment => comment._id);
      
      if (commentIds.length === 0) return comments;
      
      // 批量查询每个评论的点赞数
      const likeCountPromises = commentIds.map(commentId => 
        db.collection('like')
          .where({ commentId: commentId })
          .count()
      );
      
      const likeCountsResults = await Promise.all(likeCountPromises);
      
      // 更新评论的likeCount
      return comments.map((comment, index) => {
        const likeCountResult = likeCountsResults[index];
        return {
          ...comment,
          likeCount: likeCountResult.total || 0
        };
      });
      
    } catch (error) {
      console.error('加载点赞数失败:', error);
      return comments;
    }
  },

  /**
   * 检查用户是否已收藏
   */
  async checkUserFavourite() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) return;
    
    try {
      const db = wx.cloud.database();
      const result = await db.collection('favourite')
        .where({
          dishId: this.dishId || this.dishDbId,
          userId: userInfo.openid
        })
        .get();
      
      this.setData({
        isFavourite: result.data.length > 0
      });
    } catch (error) {
      console.error('检查收藏状态失败:', error);
    }
  },

  /**
   * 加载用户点赞过的评论
   */
  async loadUserLikedComments(dishId) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) return;
    
    const userId = userInfo.openid || userInfo._id;
    
    try {
      const db = wx.cloud.database();
      
      // 查询用户对该菜品评论的点赞记录
      const likesResult = await db.collection('like')
        .where({
          userId: userId,
          dishId: dishId
        })
        .field({
          commentId: true,
          _id: true
        })
        .get();
      
      // 构建点赞映射表
      const userLikedComments = {};
      if (likesResult.data && likesResult.data.length > 0) {
        likesResult.data.forEach(like => {
          userLikedComments[like.commentId] = true;
        });
      }
      
      this.setData({
        userLikedComments: userLikedComments
      });
      
    } catch (error) {
      console.error('加载用户点赞记录失败:', error);
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
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        return JSON.parse(tags);
      } catch {
        return tags.split(',');
      }
    }
    return [];
  },

  /**
   * 格式化时间显示
   */
  formatTime(dateString) {
    if (!dateString) return '';
    
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
    const url = e.currentTarget.dataset.url;
    if (url && url !== '/images/dish1.jpg' && url !== '/images/default-avatar.png') {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  },

  /**
   * 收藏/取消收藏菜品
   */
  async onToggleFavourite() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录后收藏菜品',
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
    
    const { isFavourite, dish } = this.data;
    const userId = userInfo.openid || userInfo._id;
    
    try {
      const db = wx.cloud.database();
      
      if (isFavourite) {
        // 取消收藏
        await db.collection('favourite')
          .where({
            dishId: dish._id,
            userId: userId
          })
          .remove();
        
        // 更新菜品收藏数
        await db.collection('dishes').doc(dish._id).update({
          data: {
            favourCount: (dish.favourCount || 1) - 1
          }
        });
        
        this.setData({
          isFavourite: false,
          'dish.favourCount': (dish.favourCount || 1) - 1
        });
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        });
      } else {
        // 添加收藏 - 保存完整的用户和菜品信息
        await db.collection('favourite').add({
          data: {
            dishId: dish._id,
            dishName: dish.name,
            dishImage: dish.imageUrl,
            dishPrice: dish.price,
            dishRating: dish.rating,
            dishDescription: dish.description,
            dishLocation: dish.location,
            dishTags: dish.tags,
            
            userId: userId,
            userAvatar: userInfo.avatarUrl || '',
            userNickname: userInfo.nickName || '匿名用户',
            
            canteenId: dish.canteenId,
            canteenName: dish.location,
            
            createTime: new Date(),
            updateTime: new Date()
          }
        });
        
        // 更新菜品收藏数
        await db.collection('dishes').doc(dish._id).update({
          data: {
            favourCount: (dish.favourCount || 0) + 1
          }
        });
        
        this.setData({
          isFavourite: true,
          'dish.favourCount': (dish.favourCount || 0) + 1
        });
        
        wx.showToast({
          title: '收藏成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  /**
   * 点赞/取消点赞评论
   */
  async onToggleLike(e) {
    const commentId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    const userId = userInfo.openid || userInfo._id;
    const userLikedComments = this.data.userLikedComments;
    const isLiked = userLikedComments[commentId];
    
    try {
      const db = wx.cloud.database();
      const comment = this.data.comments[index];
      
      if (isLiked) {
        // 取消点赞
        // 1. 删除点赞记录
        await db.collection('like')
          .where({
            commentId: commentId,
            userId: userId
          })
          .remove();
        
        // 2. 重新计算该评论的总点赞数
        const likeCountResult = await db.collection('like')
          .where({ commentId: commentId })
          .count();
        
        const newLikeCount = likeCountResult.total || 0;
        
        // 3. 更新评论的点赞数
        await db.collection('comments').doc(commentId).update({
          data: {
            likeCount: newLikeCount
          }
        });
        
        // 4. 更新本地数据
        const comments = this.data.comments;
        comments[index].likeCount = newLikeCount;
        
        // 5. 更新用户点赞记录
        delete userLikedComments[commentId];
        
        this.setData({
          comments,
          userLikedComments: { ...userLikedComments }
        });
        
        wx.showToast({
          title: '已取消点赞',
          icon: 'success'
        });
      } else {
        // 点赞
        // 1. 创建点赞记录
        await db.collection('like').add({
          data: {
            commentId: commentId,
            dishId: comment.dishId,
            dishName: comment.dishName,
            userId: userId,
            userAvatar: userInfo.avatarUrl || '',
            userNickname: userInfo.nickName || '匿名用户',
            createTime: new Date()
          }
        });
        
        // 2. 重新计算该评论的总点赞数
        const likeCountResult = await db.collection('like')
          .where({ commentId: commentId })
          .count();
        
        const newLikeCount = likeCountResult.total || 1;
        
        // 3. 更新评论的点赞数
        await db.collection('comments').doc(commentId).update({
          data: {
            likeCount: newLikeCount
          }
        });
        
        // 4. 更新本地数据
        const comments = this.data.comments;
        comments[index].likeCount = newLikeCount;
        
        // 5. 更新用户点赞记录
        userLikedComments[commentId] = true;
        
        this.setData({
          comments,
          userLikedComments: { ...userLikedComments }
        });
        
        wx.showToast({
          title: '点赞成功',
          icon: 'success'
        });
      }
      
    } catch (error) {
      console.error('点赞操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 收藏/取消收藏菜品
   */
  async onToggleFavourite() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录后收藏菜品',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return;
    }
    
    const { isFavourite, dish } = this.data;
    const userId = userInfo.openid || userInfo._id;
    
    try {
      const db = wx.cloud.database();
      
      if (isFavourite) {
        // 取消收藏
        await db.collection('favourite')
          .where({
            dishId: dish._id,
            userId: userId
          })
          .remove();
        
        // 更新菜品收藏数
        await db.collection('dishes').doc(dish._id).update({
          data: {
            favourCount: (dish.favourCount || 1) - 1
          }
        });
        
        this.setData({
          isFavourite: false,
          'dish.favourCount': (dish.favourCount || 1) - 1
        });
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        });
      } else {
        // 添加收藏 - 保存完整的用户和菜品信息
        await db.collection('favourite').add({
          data: {
            dishId: dish._id,
            dishName: dish.name,
            dishImage: dish.imageUrl,
            dishPrice: dish.price,
            dishRating: dish.rating,
            dishDescription: dish.description,
            dishLocation: dish.location,
            dishTags: dish.tags,
            
            userId: userId,
            userAvatar: userInfo.avatarUrl || '',
            userNickname: userInfo.nickName || '匿名用户',
            
            canteenId: dish.canteenId,
            canteenName: dish.location,
            
            createTime: new Date(),
            updateTime: new Date()
          }
        });
        
        // 更新菜品收藏数
        await db.collection('dishes').doc(dish._id).update({
          data: {
            favourCount: (dish.favourCount || 0) + 1
          }
        });
        
        this.setData({
          isFavourite: true,
          'dish.favourCount': (dish.favourCount || 0) + 1
        });
        
        wx.showToast({
          title: '收藏成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  /**
   * 点赞/取消点赞评论
   */
  async onToggleLike(e) {
    const commentId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    const userId = userInfo.openid || userInfo._id;
    const userLikedComments = this.data.userLikedComments;
    const isLiked = userLikedComments[commentId];
    
    try {
      const db = wx.cloud.database();
      const comment = this.data.comments[index];
      
      if (isLiked) {
        // 取消点赞
        // 1. 删除点赞记录
        await db.collection('like')
          .where({
            commentId: commentId,
            userId: userId
          })
          .remove();
        
        // 2. 重新计算该评论的总点赞数
        const likeCountResult = await db.collection('like')
          .where({ commentId: commentId })
          .count();
        
        const newLikeCount = likeCountResult.total || 0;
        
        // 3. 更新评论的点赞数
        await db.collection('comments').doc(commentId).update({
          data: {
            likeCount: newLikeCount
          }
        });
        
        // 4. 更新本地数据
        const comments = this.data.comments;
        comments[index].likeCount = newLikeCount;
        
        // 5. 更新用户点赞记录
        delete userLikedComments[commentId];
        
        this.setData({
          comments,
          userLikedComments: { ...userLikedComments }
        });
        
        wx.showToast({
          title: '已取消点赞',
          icon: 'success'
        });
      } else {
        // 点赞
        // 1. 创建点赞记录
        await db.collection('like').add({
          data: {
            commentId: commentId,
            dishId: comment.dishId,
            dishName: comment.dishName,
            userId: userId,
            userAvatar: userInfo.avatarUrl || '',
            userNickname: userInfo.nickName || '匿名用户',
            createTime: new Date()
          }
        });
        
        // 2. 重新计算该评论的总点赞数
        const likeCountResult = await db.collection('like')
          .where({ commentId: commentId })
          .count();
        
        const newLikeCount = likeCountResult.total || 1;
        
        // 3. 更新评论的点赞数
        await db.collection('comments').doc(commentId).update({
          data: {
            likeCount: newLikeCount
          }
        });
        
        // 4. 更新本地数据
        const comments = this.data.comments;
        comments[index].likeCount = newLikeCount;
        
        // 5. 更新用户点赞记录
        userLikedComments[commentId] = true;
        
        this.setData({
          comments,
          userLikedComments: { ...userLikedComments }
        });
        
        wx.showToast({
          title: '点赞成功',
          icon: 'success'
        });
      }
      
    } catch (error) {
      console.error('点赞操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
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
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    this.setData({
      showCommentPopup: true,
      newComment: {
        rating: 5,
        content: '',
        images: []
      }
    });
  },

  /**
   * 关闭弹窗
   */
  onClosePopup() {
    this.setData({
      showCommentPopup: false
    });
  },

  /**
   * 评分变化
   */
  onRatingChange(e) {
    this.setData({
      'newComment.rating': e.detail
    });
  },

  /**
   * 内容变化
   */
  onContentChange(e) {
    console.log('内容变化 input:', e.detail.value);
    this.setData({
      'newComment.content': e.detail.value
    });
  },
  
  /**
   * 内容失去焦点 - 确保数据保存
   */
  onContentBlur(e) {
    console.log('内容失去焦点:', e.detail.value);
    this.setData({
      'newComment.content': e.detail.value
    });
  },

  /**
   * 提交评论（真实提交到数据库）
   */
  async onSubmitComment() {
    console.log('开始提交评论...');
    
    const { rating, content } = this.data.newComment;
    const userInfo = wx.getStorageSync('userInfo');
    const dish = this.data.dish;
    
    console.log('当前数据:', { rating, content, userInfo, dishId: dish.dishId });
    
    if (!userInfo) {
      console.log('用户未登录');
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (!rating) {
      console.log('未选择评分');
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    if (!content || !content.trim()) {
      console.log('评论内容为空');
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }

    if (content.trim().length < 5) {
      console.log('评论内容太短:', content.trim().length);
      wx.showToast({ title: '评论内容至少5个字', icon: 'none' });
      return;
    }

    console.log('准备提交...');
    this.setData({ isSubmitting: true });

    try {
      const db = wx.cloud.database();
      const now = new Date();

      // 1. 创建评论数据
      const commentData = {
        dishId: dish.dishId,
        dishName: dish.name,
        canteenId: dish.canteenId || '',
        canteenName: dish.location,
        userId: userInfo.openid || 'user_' + Date.now(),
        userAvatar: userInfo.avatarUrl || '',
        userNickname: userInfo.nickName || '匿名用户',
        rating: Number(rating), // 确保是数字
        content: content.trim(),
        images: [],
        likeCount: 0, // 初始点赞数为0
        createTime: now,
        updateTime: now
      };

      console.log('提交的评论数据:', commentData);

      // 2. 先检查菜品ID是否存在
      console.log('菜品dishId:', dish.dishId);
      
      // 3. 提交评论
      const commentResult = await db.collection('comments').add({
        data: commentData
      });

      console.log('评论添加成功:', commentResult);

      // 4. 更新菜品的评价统计
      if (dish._id) {
        const currentRating = dish.rating || 0;
        const currentCount = dish.ratingCount || 0;
        const newRatingCount = currentCount + 1;
        const newRating = (currentRating * currentCount + rating) / newRatingCount;

        console.log('更新菜品评分:', { currentRating, currentCount, newRating, newRatingCount });

        await db.collection('dishes').doc(dish._id).update({
          data: {
            rating: Number(newRating.toFixed(1)),
            ratingCount: newRatingCount
          }
        });
      }

      // 5. 显示成功提示
      wx.showToast({
        title: '评价成功',
        icon: 'success',
        duration: 2000
      });

      // 6. 关闭弹窗并刷新数据
      this.setData({
        showCommentPopup: false,
        isSubmitting: false
      });

      // 7. 延迟一下再刷新，确保数据已同步
      setTimeout(() => {
        this.loadDishDetail(1);
      }, 500);

    } catch (error) {
      console.error('提交评论失败:', error);
      
      // 显示更详细的错误信息
      let errorMsg = '评价失败，请重试';
      if (error.errCode === -502005) {
        errorMsg = '数据库权限不足，请检查数据库权限设置';
      } else if (error.errMsg) {
        errorMsg = error.errMsg;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'error',
        duration: 3000
      });
      
      this.setData({ isSubmitting: false });
    }
  },

  /**
   * 加载更多评论
   */
  loadMoreComments() {
    if (!this.data.hasMoreComments || this.data.loading) return;
    
    const nextPage = this.data.currentPage + 1;
    this.loadDishDetail(nextPage);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadDishDetail(1);
    wx.stopPullDownRefresh();
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

  onReady() {},
  onHide() {},
  onUnload() {},
  onShareAppMessage() {
    return {
      title: this.data.dish?.name || '菜品详情',
      path: `/pages/dishDetail/index?dishId=${this.data.dish?.dishId || this.dishBusinessId}`
    }
  }
});