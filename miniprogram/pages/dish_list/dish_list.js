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
    this.setData({
      canteenId: Number(options.id),
      canteenName: options.name || "食堂"
    });

    // 示例：实际可从数据库中查食堂详情
    const sampleCanteen = {
      businessHours: "早中餐 7:00-10:00，午餐 11:00-14:00，晚餐 16:30-21:00",
      location: "梅苑东区靠近宿舍 3 栋"
    };

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
      businessHours: sampleCanteen.businessHours,
      location: sampleCanteen.location,
      dishes: sampleDishes
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
