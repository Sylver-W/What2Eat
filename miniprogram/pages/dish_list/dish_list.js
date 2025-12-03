const db = wx.cloud.database();
Page({
  data: {
    canteenId: null,
    canteenName: "",
    businessHours: "",
    location: "",

    keyword: "",
    sortType: "default", // priceAsc, priceDesc, ratingDesc, hotDesc

    dishes: [],
    loading: false
  },

  onLoad(options) {
    // 食堂信息从上个页面传过来
    const canteenId = Number(options.id);
    this.setData({
      canteenId,
      canteenName: options.name || "",
      loading: true
    });

    this.loadCanteenInfo(canteenId);
    this.loadDishesWithCloudFunction(canteenId);
  },

  loadCanteenInfo(canteenId) {
    const that = this;
    db.collection("canteens")
      .where({ canteenId })
      .get()
      .then(res => {
        if (!res.data.length) return;

        const c = res.data[0];
        that.setData({
          canteenName: c.name,
          businessHours: c.businessHours,
          location: c.location
        });
      })
      .catch(err => console.error(err));
  },

  // 使用云函数加载菜品
  async loadDishesWithCloudFunction(canteenId) {
    try {
      // 1. 查询该食堂的所有菜品
      const dbResult = await db.collection("dishes")
        .where({ canteenId: canteenId })
        .get();
      
      console.log('数据库查询结果:', dbResult);
      
      if (!dbResult.data || dbResult.data.length === 0) {
        this.setData({
          dishes: [],
          loading: false
        });
        return;
      }
      
      // 检查第一个菜品的数据结构
      const sampleDish = dbResult.data[0];
      console.log('菜品示例数据结构:', sampleDish);
      console.log('菜品价格字段:', sampleDish.price);
      console.log('菜品价格类型:', typeof sampleDish.price);
      
      // 2. 调用云函数处理图片
      const cloudResult = await wx.cloud.callFunction({
        name: 'getDishImages',
        data: {
          dishes: dbResult.data
        }
      });
      
      console.log('云函数返回结果:', cloudResult);
      
      if (cloudResult.result && cloudResult.result.success) {
        // 3. 格式化菜品数据
        const processedDishes = cloudResult.result.data.map(dish => {
          // 处理价格，确保是数字
          let price = dish.price || 0;
          if (typeof price === 'string') {
            price = parseFloat(price) || 0;
          }
          
          return {
            dishId: dish.dishId || dish._id,
            _id: dish._id,
            name: dish.name || '未知菜品',
            images: [dish.imageUrl || '/images/dish1.jpg'], // 云函数已经处理好了图片URL
            price: price, // 直接使用处理后的价格
            tags: dish.tags || [],
            rating: dish.rating || 4.0,
            ratingCount: dish.ratingCount || 0,
            description: dish.description || '暂无描述',
            isAvailable: dish.isAvailable !== false
          };
        });
        
        console.log('处理后的菜品数据:', processedDishes);
        
        this.setData({
          dishes: processedDishes,
          loading: false
        });
      } else {
        // 云函数失败，使用备选方案
        console.warn('云函数失败，使用备选方案');
        this.loadDishesFallback(dbResult.data);
      }
      
    } catch (error) {
      console.error('加载菜品失败:', error);
      this.setData({ loading: false });
    }
  },

  // 备选方案：不使用云函数
  loadDishesFallback(dishes) {
    const processedDishes = dishes.map(dish => {
      let imageUrl = '/images/dish1.jpg';
      
      // 尝试获取图片URL
      if (dish.images && Array.isArray(dish.images) && dish.images.length > 0) {
        imageUrl = dish.images[0];
      } else if (dish.image1 && dish.image1.trim() !== '') {
        imageUrl = dish.image1;
      }
      
      // 处理云存储路径
      if (imageUrl && imageUrl.startsWith('cloud://')) {
        try {
          const match = imageUrl.match(/cloud:\/\/([^\/]+)\/(.+)/);
          if (match) {
            const envId = match[1];
            const filePath = match[2];
            const envParts = envId.split('.');
            const realEnvId = envParts[0];
            imageUrl = `https://${realEnvId}.tcb.qcloud.la/${filePath}`;
          }
        } catch (e) {
          console.error('解析图片URL失败:', e);
        }
      }
      
      // 处理价格
      let price = dish.price || 0;
      if (typeof price === 'string') {
        price = parseFloat(price) || 0;
      }
      
      return {
        dishId: dish.dishId || dish._id,
        _id: dish._id,
        name: dish.name || '未知菜品',
        images: [imageUrl],
        price: price, // 使用处理后的价格
        tags: dish.tags || [],
        rating: dish.rating || 4.0,
        ratingCount: dish.ratingCount || 0,
        description: dish.description || '暂无描述',
        isAvailable: dish.isAvailable !== false
      };
    });
    
    console.log('备选方案处理后的菜品:', processedDishes);
    
    this.setData({
      dishes: processedDishes,
      loading: false
    });
  },

  // 跳转详情
  goDishDetail(e) {
    const dish = e.currentTarget.dataset.dish;
    wx.navigateTo({
      url: `/pages/dishDetail/index?id=${dish._id}&dishId=${dish.dishId}`
    });
  },

  // 搜索框
  onSearch(e) {
    const keyword = e.detail;
    this.setData({ keyword });
    
    // 如果是空搜索，重新加载数据
    if (!keyword.trim()) {
      this.loadDishesWithCloudFunction(this.data.canteenId);
      return;
    }
    
    // 这里需要先获取原始数据再搜索，暂时简单实现
    // 在实际项目中，应该搜索时再查询数据库
    wx.showToast({
      title: '搜索功能需要实现',
      icon: 'none'
    });
  },

  // 排序操作
  sortDishes(e) {
    const type = e.currentTarget.dataset.type;
    let list = [...this.data.dishes];

    if (type === "priceAsc") {
      list.sort((a, b) => a.price - b.price);
    } else if (type === "priceDesc") {
      list.sort((a, b) => b.price - a.price);
    } else if (type === "ratingDesc") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (type === "hotDesc") {
      list.sort((a, b) => b.ratingCount - a.ratingCount);
    }

    this.setData({
      dishes: list,
      sortType: type
    });
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const dishes = this.data.dishes;
    
    if (dishes[index]) {
      dishes[index].images[0] = '/images/dish1.jpg';
      this.setData({
        dishes: [...dishes]
      });
    }
  }
});