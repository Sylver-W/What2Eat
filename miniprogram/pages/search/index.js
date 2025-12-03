// pages/search/index.js
Page({
  data: {
    query: '',
    autoFocus: true,
    searchResults: [],
    hasSearched: false,
    isLoading: false,
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    hasMore: true
  },

  onLoad(options) {
    this.setData({ autoFocus: true })
  },

  onShow() {
    this.setData({ autoFocus: true })
  },

  onInputChange(e) {
    this.setData({
      query: e.detail.value.trim()
    })
  },

  onClearInput() {
    if (this.data.query) {
      this.setData({
        query: '',
        autoFocus: true,
        searchResults: [],
        hasSearched: false,
        currentPage: 1,
        totalCount: 0,
        hasMore: true
      })
    }
  },

  onCancel() {
    this.setData({
      query: '',
      searchResults: [],
      hasSearched: false,
      currentPage: 1,
      totalCount: 0,
      hasMore: true
    })
    wx.hideKeyboard()
  },

  onSearch() {
    const query = this.data.query
    
    if (!query) {
      wx.showToast({
        title: '请输入菜品名称',
        icon: 'none',
        duration: 1500
      })
      return
    }

    this.setData({
      currentPage: 1,
      totalCount: 0,
      hasMore: true
    })

    this.searchDishesByName(query, 1)
  },

  /**
   * 搜索菜品（使用云函数方案）
   */
  async searchDishesByName(name, page = 1) {
    this.setData({ isLoading: true })
    
    wx.showLoading({
      title: '搜索中...',
      mask: true
    })

    try {
      // 方案A：使用一体化云函数（推荐）
      const result = await this.searchWithCloudFunction(name, page)
      
      // 方案B：分步处理（备用）
      // const result = await this.searchStepByStep(name, page)
      
      this.handleSearchResult(result, page)
      
    } catch (error) {
      console.error('搜索失败:', error)
      this.handleSearchError(error)
    } finally {
      wx.hideLoading()
      this.setData({ isLoading: false })
    }
  },

  /**
   * 方案A：使用一体化云函数
   */
  async searchWithCloudFunction(name, page) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'searchDishes',
        data: {
          name: name,
          page: page,
          pageSize: this.data.pageSize
        }
      })
      
      return result.result
    } catch (error) {
      console.error('云函数调用失败，使用备用方案:', error)
      // 如果云函数失败，使用分步方案
      return await this.searchStepByStep(name, page)
    }
  },

  /**
   * 方案B：分步处理（备用方案）
   */
  async searchStepByStep(name, page) {
    const db = wx.cloud.database()
    const skipCount = (page - 1) * this.data.pageSize
    
    // 1. 搜索菜品
    const searchResult = await db.collection('dishes')
      .where({
        name: db.RegExp({
          regexp: this.escapeRegExp(name),
          options: 'i'
        })
      })
      .orderBy('rating', 'desc')
      .skip(skipCount)
      .limit(this.data.pageSize)
      .get()

    // 2. 获取总数
    const countResult = await db.collection('dishes')
      .where({
        name: db.RegExp({
          regexp: this.escapeRegExp(name),
          options: 'i'
        })
      })
      .count()

    // 3. 处理图片（使用图片处理云函数）
    let processedDishes = []
    if (searchResult.data && searchResult.data.length > 0) {
      const imageResult = await wx.cloud.callFunction({
        name: 'getDishImages',
        data: {
          dishes: searchResult.data
        }
      })
      
      processedDishes = imageResult.result.data || []
    }

    return {
      success: true,
      data: processedDishes,
      total: countResult.total,
      hasMore: searchResult.data.length === this.data.pageSize
    }
  },

  /**
   * 处理搜索结果
   */
  handleSearchResult(result, page) {
    if (!result.success) {
      wx.showToast({
        title: result.error || '搜索失败',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 格式化数据
    const processedResults = result.data.map(dish => this.formatDishData(dish))

    let searchResults
    if (page === 1) {
      searchResults = processedResults
    } else {
      searchResults = [...this.data.searchResults, ...processedResults]
    }

    this.setData({
      searchResults: searchResults,
      hasSearched: true,
      currentPage: page,
      totalCount: result.total || 0,
      hasMore: result.hasMore || processedResults.length === this.data.pageSize
    })
  },

  /**
   * 处理搜索错误
   */
  handleSearchError(error) {
    if (error.errCode === -501003) {
      wx.showToast({
        title: '菜品数据未就绪',
        icon: 'none',
        duration: 2000
      })
    } else {
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 格式化菜品数据
   */
  formatDishData(dish) {
    // 注意：dish.imageUrl 已经在云函数中处理过了
    return {
      id: dish._id,
      _id: dish._id,
      dishId: dish.dishId || 0,
      name: dish.name || '未知菜品',
      description: dish.description || '暂无描述',
      price: dish.price || 0,
      location: dish.canteenName || '未知食堂',
      rating: dish.rating || 4.0,
      ratingCount: dish.ratingCount || 0,
      imageUrl: dish.imageUrl || '/images/dish1.jpg',
      canteenId: dish.canteenId || 0,
      tags: this.formatTagsFromDatabase(dish.tags)
    }
  },

  /**
   * 格式化标签
   */
  formatTagsFromDatabase(dbTags) {
    if (!Array.isArray(dbTags)) {
      return {
        breakfast: false,
        lunch: false,
        dinner: false
      }
    }
    
    const tags = {
      breakfast: false,
      lunch: false,
      dinner: false
    }
    
    dbTags.forEach(tag => {
      const tagLower = tag.toLowerCase()
      if (tagLower.includes('早餐') || tagLower.includes('早饭')) {
        tags.breakfast = true
      } else if (tagLower.includes('午餐') || tagLower.includes('午饭')) {
        tags.lunch = true
      } else if (tagLower.includes('晚餐') || tagLower.includes('晚饭') || tagLower.includes('夜宵')) {
        tags.dinner = true
      }
    })
    
    return tags
  },

  /**
   * 转义正则特殊字符
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  },

  /**
   * 点击菜品卡片
   */
  onDishTap(e) {
    const dishId = e.currentTarget.dataset.id
    const dish = this.data.searchResults.find(item => item.id === dishId)
    
    if (dish) {
      wx.navigateTo({
        url: `/pages/dishDetail/index?id=${dish._id}&dishId=${dish.dishId}`
      })
    }
  },

  /**
   * 页面上拉触底
   */
  onReachBottom() {
    if (this.data.isLoading || !this.data.hasMore || !this.data.hasSearched) {
      return
    }

    const nextPage = this.data.currentPage + 1
    const query = this.data.query
    
    if (query) {
      this.searchDishesByName(query, nextPage)
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    const query = this.data.query
    
    if (query) {
      this.setData({
        currentPage: 1,
        totalCount: 0,
        hasMore: true
      })

      await this.searchDishesByName(query, 1)
    }
    
    wx.stopPullDownRefresh()
  },

  /**
   * 图片加载错误处理
   */
  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const searchResults = this.data.searchResults
    
    if (searchResults[index]) {
      searchResults[index].imageUrl = '/images/dish1.jpg'
      this.setData({
        searchResults: [...searchResults]
      })
    }
  },

  /**
   * 点击添加菜品建议
   */
  onAddSuggestion() {
    wx.navigateTo({
      url: '/pages/user/addDish/index'
    })
  },

  onReady() {},
  onHide() {},
  onUnload() {},
  onShareAppMessage() {}
})