Page({
  data: {
    dishes: [
      {
        id: 1,
        name: "火腿鸡肉饭",
        price: 18.0,
        image: "/images/dish1.jpg"
      },
      {
        id: 2,
        name: "鱼香肉丝炒",
        price: 12.88,
        image: "/images/dish2.jpg"
      },
      {
        id: 3,
        name: "热干面",
        price: 4.0,
        image: "/images/dish3.jpg"
      }
    ],
    active: 0,
  },
  onChange(event) {
    this.setData({ active: event.detail });
  },
  goCanteenList() {
    wx.navigateTo({ url: '/pages/canteen/index' })
  },

  goDishSearch() {
    wx.navigateTo({ url: '/pages/search/index' })
  },

  goIntroDetail() {
    wx.navigateTo({ url: '/pages/intro/index' })
  }
})
