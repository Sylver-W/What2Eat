// pages/canteen/canteen.js
Page({
  data: {
    active: 'canteen',
    searchValue: '',
    canteens: [
      {
        id: 1,
        name: '东园食堂',
        image: '/images/dongyuan.jpg',
        rating: 4.5,
        location: '爱因斯坦广场东南侧',
        isOpen: true,
        businessHours: '早餐6:50-9:00, 中餐11:00-13:30, 晚餐17:00-19:30',
        featuredDishes: ['蒸点'],
        featuredDisplay: '蒸点'  // 新增：用于显示的字符串
      },
      {
        id: 2,
        name: '韵苑食堂',
        image: '/images/yunyuan.jpg',
        rating: 4.3,
        location: '东操场北侧',
        isOpen: true,
        businessHours: '早中餐6:50-14:00, 晚餐16:50-23:00',
        featuredDishes: ['胡辣汤'],
        featuredDisplay: '胡辣汤'
      },
      {
        id: 3,
        name: '学一食堂',
        image: '/images/xueyi.jpg',
        rating: 4.4,
        location: '东操场南侧',
        isOpen: true,
        businessHours: '早餐6:50-9:00, 中餐11:00-13:30, 晚餐17:00-19:30',
        featuredDishes: ['擂饭'],
        featuredDisplay: '擂饭'
      },
      {
        id: 4,
        name: '学二食堂',
        image: '/images/xueer.jpg',
        rating: 4.2,
        location: '东操场南侧',
        isOpen: true,
        businessHours: '早中餐6:50-14:00, 晚餐16:30-21:40',
        featuredDishes: ['赣味小炒'],
        featuredDisplay: '赣味小炒'
      },
      {
        id: 5,
        name: '东一食堂',
        image: '/images/dongyi.jpg',
        rating: 4.6,
        location: '中心操场北侧',
        isOpen: true,
        businessHours: '早中餐6:50-14:00, 晚餐16:30-23:00',
        featuredDishes: ['麻辣香锅'],
        featuredDisplay: '麻辣香锅'
      },
      {
        id: 6,
        name: '百景园食堂',
        image: '/images/baijingyuan.jpg',
        rating: 4.7,
        location: '西边高层小区西南侧',
        isOpen: true,
        businessHours: '早餐6:50-9:00, 中餐11:00-13:30, 晚餐17:00-22:00',
        featuredDishes: ['自助餐'],
        featuredDisplay: '自助餐'
      },
      {
        id: 7,
        name: '喻园食堂',
        image: '/images/yuyuan.jpg',
        rating: 4.3,
        location: '集贸市场南侧',
        isOpen: true,
        businessHours: '早中餐6:50-13:30, 晚餐16:30-19:00',
        featuredDishes: ['铁板面'],
        featuredDisplay: '铁板面'
      },
      {
        id: 8,
        name: '集贤楼食堂',
        image: '/images/jixianlou.jpg',
        rating: 4.1,
        location: '管理学院东南侧',
        isOpen: true,
        businessHours: '早餐6:50-10:00, 中餐11:00-13:30, 晚餐16:30-19:00',
        featuredDishes: ['平价食堂'],
        featuredDisplay: '平价食堂'
      },
      {
        id: 9,
        name: '西一食堂',
        image: '/images/xiyi.jpg',
        rating: 4.5,
        location: '西操场北侧20米',
        isOpen: true,
        businessHours: '早中餐6:50-14:00, 晚餐16:30-23:00',
        featuredDishes: ['江浙风味菜', '川湘风味菜', '湖北风味菜'],
        featuredDisplay: '江浙、川湘、湖北风味菜'
      },
      {
        id: 10,
        name: '西二食堂',
        image: '/images/xier.jpg',
        rating: 4.4,
        location: '西操场北侧20米',
        isOpen: true,
        businessHours: '中餐11:00-13:00, 晚餐17:00-19:00',
        featuredDishes: ['王喜峰麻辣烫', '砂锅煲仔'],
        featuredDisplay: '王喜峰麻辣烫、砂锅煲仔'
      },
      {
        id: 11,
        name: '百惠园食堂',
        image: '/images/baihuiyuan.jpg',
        rating: 4.6,
        location: '紫菘学生公寓入口处',
        isOpen: true,
        businessHours: '早中餐6:50-14:00, 晚餐16:50-23:00',
        featuredDishes: ['日式咖喱鸡排饭', '卤肉饭'],
        featuredDisplay: '日式咖喱鸡排饭、卤肉饭'
      }
    ]
  },

  onLoad() {
    console.log('食堂页面加载');
    this.checkBusinessHours();
  },

  // 检查营业状态
  checkBusinessHours() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour + currentMinutes / 60;

    const canteens = this.data.canteens.map(canteen => {
      let isOpen = false;
      const hours = canteen.businessHours;
      
      // 简化的营业时间判断逻辑
      if (hours.includes('早餐') && currentTime >= 6.83 && currentTime <= 9) {
        isOpen = true;
      } else if (hours.includes('中餐') && currentTime >= 11 && currentTime <= 14) {
        isOpen = true;
      } else if (hours.includes('晚餐') && currentTime >= 16.5 && currentTime <= 23) {
        isOpen = true;
      } else if (hours.includes('早中餐') && currentTime >= 6.83 && currentTime <= 14) {
        isOpen = true;
      }
      
      return { ...canteen, isOpen };
    });

    this.setData({ canteens });
  },

  // 搜索功能
  onSearch(event) {
    const value = event.detail;
    this.setData({ searchValue: value });
    console.log('搜索:', value);
  },

  // 跳转到食堂详情
  goCanteenDetail(e) {
    const canteen = e.currentTarget.dataset.canteen;
    wx.navigateTo({
      url: `/pages/canteen-detail/canteen-detail?id=${canteen.id}&name=${canteen.name}`
    });
  },

  onChange(event) {
    // 推荐：使用 event.detail 获取点击项的名称 (name)
    const name = event.detail; 
    // 如果你的Vant版本返回的是索引，则用下面这行获取索引
    // const index = event.detail; 

    console.log('切换到:', name); // 打印日志，方便调试

    if (name === 'home') {
      // 跳转到首页页面
      wx.navigateTo({
        url: '/pages/index/index'
      });
    } else if (name === 'user') {
      // 这里先注释掉，等以后创建了用户页面再启用
      // wx.navigateTo({
      //   url: '/pages/user/user'
      // });
      wx.showToast({
        title: '用户页面开发中',
        icon: 'none'
      });
    }
    // 点击"首页"时，由于已在首页，可以不处理，或者你希望有些效果（比如刷新），可以在这里写。
  },
})