// pages/search/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    query: '',
    autoFocus: true,
    searchResults: [],  // 搜索结果列表
    hasSearched: false, // 是否已进行搜索
    isLoading: false,   // 是否正在加载
    currentPage: 1,     // 当前页码
    pageSize: 10,       // 每页显示数量
    totalCount: 0,      // 总结果数
    hasMore: true       // 是否还有更多数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      autoFocus: true
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.setData({
      autoFocus: true
    });
  },

  /**
   * 输入内容变化
   */
  onInputChange(e) {
    const query = e.detail.value.trim();
    this.setData({
      query: query
    });
  },

  /**
   * 清除输入内容
   */
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
      });
    }
  },

  /**
   * 取消按钮点击事件
   */
  onCancel() {
    this.setData({
      query: '',
      searchResults: [],
      hasSearched: false,
      currentPage: 1,
      totalCount: 0,
      hasMore: true
    });
    
    wx.hideKeyboard();
  },

  /**
   * 执行查询（回车键触发）
   */
  onSearch() {
    const query = this.data.query;
    
    // 如果查询内容为空，显示提示
    if (!query) {
      wx.showToast({
        title: '请输入菜品名称',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    // 重置分页数据
    this.setData({
      currentPage: 1,
      totalCount: 0,
      hasMore: true
    });

    // 执行搜索
    this.searchDishesByName(query, 1);
  },

  /**
   * 根据菜品名称搜索
   */
  async searchDishesByName(name, page = 1) {
    // 显示加载状态
    this.setData({
      isLoading: true
    });

    // 显示加载提示
    wx.showLoading({
      title: '搜索中...',
      mask: true
    });

    try {
      // 获取云数据库实例
      const db = wx.cloud.database();
      
      // 计算跳过的记录数
      const skipCount = (page - 1) * this.data.pageSize;
      
      // 执行查询：名称类似（模糊搜索）
      const result = await db.collection('dishes')
        .where({
          name: db.RegExp({
            regexp: this.escapeRegExp(name),  // 转义特殊字符
            options: 'i'  // 忽略大小写
          })
        })
        .orderBy('rating', 'desc')  // 按评分降序排序
        .skip(skipCount)
        .limit(this.data.pageSize)
        .get();

      // 获取总数量
      const countResult = await db.collection('dishes')
        .where({
          name: db.RegExp({
            regexp: this.escapeRegExp(name),
            options: 'i'
          })
        })
        .count();

      // 处理查询结果
      let searchResults;
      if (page === 1) {
        // 第一页，直接替换
        searchResults = result.data.map(item => this.formatDishData(item));
      } else {
        // 后续页码，追加数据
        const formattedData = result.data.map(item => this.formatDishData(item));
        searchResults = [...this.data.searchResults, ...formattedData];
      }

      // 更新页面数据
      this.setData({
        searchResults: searchResults,
        hasSearched: true,
        isLoading: false,
        currentPage: page,
        totalCount: countResult.total,
        hasMore: result.data.length === this.data.pageSize
      });

      wx.hideLoading();

      // 如果无结果，显示提示
      if (searchResults.length === 0) {
        wx.showToast({
          title: '未找到相关菜品',
          icon: 'none',
          duration: 2000
        });
      }

    } catch (error) {
      console.error('搜索失败:', error);
      wx.hideLoading();
      
      this.setData({
        isLoading: false
      });

      // 检查是否为未创建集合的错误
      if (error.errCode === -501003) {
        wx.showToast({
          title: '菜品数据未就绪',
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '搜索失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  /**
   * 转义正则表达式特殊字符
   * 防止用户输入包含 . * + ? ^ $ { } ( ) | [ ] \ 等字符时导致正则错误
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * 格式化菜品数据（根据新表结构）
   */
  formatDishData(dish) {
    // 使用 image1 字段，如果没有则使用默认图片
    const imageUrl = dish.image1 || '/images/dish1.jpg';

    // 处理数据库中的 tags 数组字段
    const tags = this.formatTagsFromDatabase(dish.tags);

    return {
      id: dish._id,
      dishId: dish.dishId || 0,
      name: dish.name || '未知菜品',
      description: dish.description || '暂无描述',
      price: dish.price || 0,
      location: dish.canteenName || '未知食堂',
      rating: dish.rating || 4.0,
      ratingCount: dish.ratingCount || 0,
      imageUrl: imageUrl,
      canteenId: dish.canteenId || 0,
      tags: tags
    };
  },

    /**
   * 格式化数据库中的 tags 数组为前端需要的格式
   * @param {Array} dbTags - 数据库中的标签数组，如 ['早餐', '午餐', '晚餐']
   * @returns {Object} - 前端需要的标签对象格式
   */
  formatTagsFromDatabase(dbTags) {
    // 如果数据库中没有 tags 字段或不是数组，返回空对象
    if (!Array.isArray(dbTags)) {
      return {
        breakfast: false,
        lunch: false,
        dinner: false
      };
    }
    
    // 转换为前端需要的格式
    const tags = {
      breakfast: false,
      lunch: false,
      dinner: false
    };
    
    // 遍历数据库标签，设置对应的属性为 true
    dbTags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      
      if (tagLower.includes('早餐') || tagLower.includes('早饭')) {
        tags.breakfast = true;
      } else if (tagLower.includes('午餐') || tagLower.includes('午饭')) {
        tags.lunch = true;
      } else if (tagLower.includes('晚餐') || tagLower.includes('晚饭') || tagLower.includes('夜宵')) {
        tags.dinner = true;
      }
    });
    
    return tags;
  },

  /**
   * 点击菜品卡片
   */
  onDishTap(e) {
    const dishId = e.currentTarget.dataset.id;
    const dish = this.data.searchResults.find(item => item.id === dishId);
    
    if (dish) {
      // 跳转到菜品详情页面
      wx.navigateTo({
        url: `/pages/dishDetail/index?id=${dish._id}&dishId=${dish.dishId}`
      });
    }
  },

  /**
   * 页面上拉触底事件的处理函数 - 加载更多
   */
  onReachBottom() {
    // 如果正在加载或没有更多数据，则不执行
    if (this.data.isLoading || !this.data.hasMore || !this.data.hasSearched) {
      return;
    }

    // 加载下一页
    const nextPage = this.data.currentPage + 1;
    const query = this.data.query;
    
    if (query) {
      this.searchDishesByName(query, nextPage);
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    const query = this.data.query;
    
    if (query) {
      // 重置分页数据
      this.setData({
        currentPage: 1,
        totalCount: 0,
        hasMore: true
      });

      await this.searchDishesByName(query, 1);
    }
    
    wx.stopPullDownRefresh();
  },

  /**
   * 初始化云数据库（可选，可以在app.js中统一初始化）
   */
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: '你的云环境ID', // 这里需要替换为你的云环境ID
        traceUser: true,
      });
    }
  },

  /**
   * 点击添加菜品建议
   */
  onAddSuggestion() {
    // 跳转到添加菜品页面
    wx.navigateTo({
      url: '/pages/user/addDish/index'
    });
  },

  /**
   * 其他生命周期函数
   */
  onReady() {},
  onHide() {},
  onUnload() {},
  onShareAppMessage() {}
})