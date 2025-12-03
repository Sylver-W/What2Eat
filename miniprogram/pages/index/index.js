// pages/index/index.js
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
        name: "鱼香肉丝",
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
    active: 'home',
  },

  onChange(event) {
    // 推荐：使用 event.detail 获取点击项的名称 (name)
    const name = event.detail; 
    // 如果你的Vant版本返回的是索引，则用下面这行获取索引
    // const index = event.detail; 

    console.log('切换到:', name); // 打印日志，方便调试

    if (name === 'canteen') {
      // 跳转到食堂页面
      wx.navigateTo({
        url: '/pages/canteen/canteen'
      });
    } else if (name === 'user') {
      wx.navigateTo({
        url: '/pages/user/user'
      });
    }
    // 点击"首页"时，由于已在首页，可以不处理，或者你希望有些效果（比如刷新），可以在这里写。
  },

  goCanteenList() {
    wx.navigateTo({ url: '/pages/canteen/canteen' })
  },

  goDishSearch() {
    wx.navigateTo({ url: '/pages/search/index' })
  },

  goIntroDetail() {
    wx.navigateTo({ url: '/pages/intro/index' })
  }
})