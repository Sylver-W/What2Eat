const db = wx.cloud.database();
Page({
  data: {
    canteenId: null,
    canteenName: "",
    businessHours: "",
    location: "",

    keyword: "",
    sortType: "default", // priceAsc, priceDesc, ratingDesc, hotDesc

    dishes: []
  },

  onLoad(options) {
    // 食堂信息从上个页面传过来
    const canteenId = Number(options.id);
    this.setData({
      canteenId,
      canteenName: options.name || ""
    });

    this.loadCanteenInfo(canteenId);
    // this.loadDishes(canteenId);

    const sampleDishes = [
      {
        dishId: 101,
        name: "鲜肉包",
        images: ["/images/bao.jpg"],
        price: 2.0,
        tags: ["早餐"],
        rating: 4.8,
        ratingCount: 120,
        description: "优选新鲜猪肉，皮薄馅大，软糯可口。",
        isAvailable: true
      },
      {
        dishId: 102,
        name: "桂花糕",
        images: ["/images/cake.jpg"],
        price: 2.0,
        tags: ["早餐"],
        rating: 4.6,
        ratingCount: 80,
        description: "软糯香甜，桂花香气四溢。",
        isAvailable: true
      },
      {
        dishId: 103,
        name: "烧麦",
        images: ["/images/shaomai.jpg"],
        price: 2.0,
        tags: ["早餐"],
        rating: 4.5,
        ratingCount: 66,
        description: "皮薄馅足，味道鲜美。",
        isAvailable: false
      },
      {
        dishId: 104,
        name: "牛肉面",
        images: ["/images/beef.jpg"],
        price: 12.0,
        tags: ["早餐", "午餐", "晚餐"],
        rating: 4.9,
        ratingCount: 200,
        description: "骨汤熬制，牛肉鲜嫩，面条劲道。",
        isAvailable: true
      }
    ];

    this.setData({
      dishes: sampleDishes
    });
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

  loadDishes(canteenId) {
    db.collection("dish")
      .where({ canteenId })
      .get()
      .then(res => {
        this.setData({
          dishes: res.data
        });
      });
  },

  // 跳转详情
  goDishDetail(e) {
    const dish = e.currentTarget.dataset.dish;
    wx.navigateTo({
      url: `/pages/dish_detail/dish_detail?dishId=${dish.dishId}`
    });
  },

  // 搜索框
  onSearch(e) {
    this.setData({ keyword: e.detail });
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
  }
});
