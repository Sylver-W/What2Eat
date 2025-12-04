// pages/user/myComment/index.js
Page({
  data: {
    commentList: [],        // 评价列表
    isLoading: false,       // 初始加载状态
    isLoadingMore: false,   // 加载更多状态
    isRefreshing: false,    // 下拉刷新状态
    pageSize: 10,           // 每页数量
    pageIndex: 0,           // 当前页码
    hasMore: true,          // 是否还有更多数据
    totalCount: 0,          // 总评价数
    userInfo: null,         // 用户信息
    loadingFailed: false    // 加载是否失败
  },

  onLoad() {
    console.log('=== mycomment页面加载 ===')
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    console.log('存储的用户信息:', userInfo)
    
    if (!userInfo) {
      this.showLoginDialog()
      return
    }
    
    this.setData({ userInfo })
    this.loadMyComments(true)
  },

  onShow() {
    // 每次显示页面时检查登录状态并刷新
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      this.showLoginDialog()
      return
    }
    
    // 如果用户信息变化，重新加载
    if (userInfo.openid !== this.data.userInfo?.openid) {
      this.setData({ userInfo })
      this.loadMyComments(true)
    } else if (this.data.commentList.length > 0) {
      // 已有数据，刷新一下
      this.refreshCommentList()
    }
  },

  // 显示登录对话框
  showLoginDialog() {
    wx.showModal({
      title: '提示',
      content: '请先登录查看我的评价',
      confirmText: '去登录',
      cancelText: '返回',
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
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('=== 下拉刷新 ===')
    if (!wx.getStorageSync('userInfo')) {
      wx.stopPullDownRefresh()
      this.showLoginDialog()
      return
    }
    
    this.setData({ isRefreshing: true })
    this.refreshCommentList()
  },

  // 刷新评价列表
  async refreshCommentList() {
    console.log('=== 刷新评论列表 ===')
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getmycomments',
        data: {
          pageIndex: 0,
          pageSize: this.data.pageSize
        }
      })

      console.log('刷新结果:', result)
      
      if (result.result.code === 0) {
        const newData = result.result.data
        const processedComments = this.processComments(newData.list || [])
        
        this.setData({
          commentList: processedComments,
          pageIndex: 1,
          hasMore: newData.hasMore,
          totalCount: newData.totalCount || 0,
          isRefreshing: false,
          loadingFailed: false
        })
        
        console.log('刷新成功，共', newData.totalCount, '条评论')
        
        // 更新用户评论数
        this.updateUserCommentCount(newData.totalCount)
        
      } else {
        console.error('刷新失败:', result.result.msg)
        this.setData({ 
          isRefreshing: false,
          loadingFailed: true 
        })
        wx.showToast({
          title: result.result.msg || '刷新失败',
          icon: 'none',
          duration: 2000
        })
      }
      
      wx.stopPullDownRefresh()
      
    } catch (error) {
      console.error('刷新评价失败:', error)
      this.setData({ 
        isRefreshing: false,
        loadingFailed: true 
      })
      wx.showToast({
        title: '刷新失败，请重试',
        icon: 'none',
        duration: 2000
      })
      wx.stopPullDownRefresh()
    }
  },

  // 加载我的评价
  async loadMyComments(isInitial = false) {
    console.log('=== 加载我的评价 ===', isInitial ? '初始加载' : '加载更多')
    
    // 检查用户登录
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      this.showLoginDialog()
      return
    }

    // 防止重复加载
    if ((isInitial && this.data.isLoading) || 
        (!isInitial && (this.data.isLoadingMore || !this.data.hasMore))) {
      console.log('跳过加载：', {
        isLoading: this.data.isLoading,
        isLoadingMore: this.data.isLoadingMore,
        hasMore: this.data.hasMore
      })
      return
    }

    // 显示加载状态
    if (isInitial) {
      wx.showLoading({ title: '加载中...', mask: true })
      this.setData({ isLoading: true })
    } else {
      this.setData({ isLoadingMore: true })
    }

    try {
      console.log('调用云函数 getmycomments...')
      const result = await wx.cloud.callFunction({
        name: 'getmycomments',
        data: {
          pageIndex: isInitial ? 0 : this.data.pageIndex,
          pageSize: this.data.pageSize
        }
      })

      wx.hideLoading()
      console.log('云函数返回:', {
        code: result.result.code,
        msg: result.result.msg,
        dataCount: result.result.data?.list?.length || 0
      })
      
      if (result.result.code === 0) {
        const newData = result.result.data
        const processedComments = this.processComments(newData.list || [])
        
        const newList = isInitial ? 
          processedComments : 
          [...this.data.commentList, ...processedComments]
        
        this.setData({
          commentList: newList,
          pageIndex: isInitial ? 1 : this.data.pageIndex + 1,
          hasMore: newData.hasMore,
          totalCount: newData.totalCount || 0,
          isLoading: false,
          isLoadingMore: false,
          loadingFailed: false
        })

        console.log('加载成功，当前总数:', newData.totalCount, '本次加载:', processedComments.length)
        
        // 更新用户评论数
        this.updateUserCommentCount(newData.totalCount)
        
      } else {
        console.error('加载失败:', result.result.msg)
        wx.showToast({
          title: result.result.msg || '加载失败',
          icon: 'none',
          duration: 2000
        })
        this.setData({ 
          isLoading: false, 
          isLoadingMore: false,
          loadingFailed: true
        })
      }
    } catch (error) {
      console.error('加载评价失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '加载失败，请检查网络',
        icon: 'none',
        duration: 2000
      })
      this.setData({ 
        isLoading: false, 
        isLoadingMore: false,
        loadingFailed: true
      })
    }
  },

  // 处理评论数据
  processComments(comments) {
    console.log('处理评论数据:', comments.length, '条')
    
    return comments.map(comment => {
      // 处理时间格式
      comment.formattedTime = this.formatTime(comment.createTime)
      
      // 确保必要字段有值
      comment.dishId = comment.dishId || 0
      comment.dishName = comment.dishName || '未知菜品'
      comment.canteenName = comment.canteenName || '未知食堂'
      comment.content = comment.content || ''
      comment.rating = comment.rating || 5
      comment.likeCount = comment.likeCount || 0
      
      // 确保images是数组
      if (!Array.isArray(comment.images)) {
        comment.images = comment.images ? [comment.images] : []
      }
      
      // 处理用户显示名
      if (!comment.userNickname || comment.userNickname === '匿名用户') {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.nickName) {
          comment.userNickname = userInfo.nickName
        } else if (userInfo && userInfo.nickname) {
          comment.userNickname = userInfo.nickname
        }
      }
      
      return comment
    })
  },

  // 格式时间显示
  formatTime(time) {
    if (!time) return '未知时间'
    
    try {
      let date
      
      // 处理云数据库的日期格式
      if (time.$date) {
        date = new Date(time.$date)
      } else if (typeof time === 'string') {
        date = new Date(time)
      } else if (time instanceof Date) {
        date = time
      } else {
        return '未知时间'
      }
      
      if (isNaN(date.getTime())) {
        return '未知时间'
      }
      
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffMins < 1) {
        return '刚刚'
      } else if (diffMins < 60) {
        return `${diffMins}分钟前`
      } else if (diffHours < 24) {
        return `${diffHours}小时前`
      } else if (diffDays === 1) {
        return '昨天'
      } else if (diffDays < 7) {
        return `${diffDays}天前`
      } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}周前`
      } else {
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        
        if (year === now.getFullYear()) {
          return `${month}-${day}`
        } else {
          return `${year}-${month}-${day}`
        }
      }
    } catch (error) {
      console.error('格式化时间失败:', error)
      return '未知时间'
    }
  },

  // 更新用户评论数（更新本地存储和通知主页）
  updateUserCommentCount(count) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        userInfo.commentCount = count
        wx.setStorageSync('userInfo', userInfo)
        console.log('更新用户评论数:', count)
      }
      
      // 存储到独立字段
      wx.setStorageSync('commentCount', count)
      
      // 通知主页更新
      this.notifyHomePageUpdate(count)
      
    } catch (error) {
      console.error('更新评论数失败:', error)
    }
  },
  
  // 通知主页更新评论数
  notifyHomePageUpdate(count) {
    try {
      // 获取当前页面栈
      const pages = getCurrentPages()
      
      // 查找主页实例
      for (let i = pages.length - 1; i >= 0; i--) {
        const page = pages[i]
        // 根据你的主页路由路径修改
        if (page.route === 'pages/user/index' || 
            page.route === 'pages/index/index' ||
            page.__route__ === 'pages/user/index') {
          
          // 更新主页的评论数
          page.setData({
            commentCount: count
          })
          
          console.log('已通知主页更新评论数:', count)
          break
        }
      }
    } catch (error) {
      console.error('通知主页更新失败:', error)
    }
  },

  // 加载更多
  loadMore() {
    console.log('=== 加载更多 ===')
    if (this.data.hasMore && !this.data.isLoadingMore && !this.data.isLoading) {
      this.loadMyComments(false)
    } else {
      console.log('不满足加载更多条件:', {
        hasMore: this.data.hasMore,
        isLoadingMore: this.data.isLoadingMore,
        isLoading: this.data.isLoading
      })
    }
  },

  // 删除评价
  deleteComment(e) {
    const commentId = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    const comment = this.data.commentList[index]
    
    if (!comment) {
      console.log('未找到评论')
      return
    }
    
    console.log('删除评论:', commentId, index)
    
    wx.showModal({
      title: '删除评价',
      content: '确定要删除这条评价吗？删除后不可恢复。',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          await this.removeComment(commentId, comment.dishId, index)
        }
      }
    })
  },

  // 移除评价
  async removeComment(commentId, dishId, index) {
    console.log('执行删除:', { commentId, dishId, index })
    
    wx.showLoading({ title: '删除中...', mask: true })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deletecomment',
        data: { 
          commentId,
          dishId
        }
      })

      wx.hideLoading()
      console.log('删除结果:', result)
      
      if (result.result.code === 0) {
        // 从列表中移除
        const newList = [...this.data.commentList]
        newList.splice(index, 1)
        
        const newTotalCount = Math.max(0, this.data.totalCount - 1)
        
        this.setData({
          commentList: newList,
          totalCount: newTotalCount
        })
        
        // 更新用户评论数
        this.updateUserCommentCount(newTotalCount)
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: result.result.msg || '删除失败',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('删除评价失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 查看菜品详情
  goToDishDetail(e) {
    console.log('=== 跳转菜品详情 ===')
    console.log('点击事件数据:', e.currentTarget.dataset)
    
    const dishId = e.currentTarget.dataset.dishid
    const index = e.currentTarget.dataset.index
    const comment = this.data.commentList[index]
    
    if (!comment) {
      wx.showToast({
        title: '评论信息错误',
        icon: 'none'
      })
      return
    }
    
    console.log('跳转的菜品信息:', {
      dishId: comment.dishId,
      dishName: comment.dishName
    })
    
    // 直接传递 dishId（业务ID）
    if (comment.dishId) {
      wx.navigateTo({
        url: `/pages/dishDetail/index?dishId=${comment.dishId}`
      })
    } else {
      wx.showToast({
        title: '菜品信息缺失',
        icon: 'none'
      })
    }
  },

  // 预览图片
  previewImage(e) {
    console.log('预览图片:', e.currentTarget.dataset)
    const index = e.currentTarget.dataset.index
    const images = e.currentTarget.dataset.images
    
    if (Array.isArray(images) && images.length > 0) {
      wx.previewImage({
        current: images[index],
        urls: images
      })
    }
  },

  // 编辑评价（暂时简单实现）
  editComment(e) {
    const commentId = e.currentTarget.dataset.id
    console.log('编辑评论:', commentId)
    
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    })
  },

  // 重新加载
  retryLoad() {
    console.log('重新加载')
    this.setData({ loadingFailed: false })
    this.loadMyComments(true)
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的评价',
      path: '/pages/user/myComment/index'
    }
  },

  onShareTimeline() {
    return {
      title: '我的评价'
    }
  }
})