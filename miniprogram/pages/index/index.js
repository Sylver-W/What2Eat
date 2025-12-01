<<<<<<< HEAD
=======
// pages/index/index.js
>>>>>>> 9089c94f1989c686ea88f12a8b8762c991a12855
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
<<<<<<< HEAD
    active: 0,
  },
=======
    active: 'home',
  },

>>>>>>> 9089c94f1989c686ea88f12a8b8762c991a12855
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
<<<<<<< HEAD
       wx.navigateTo({
         url: '/pages/user/user'
       });
      // wx.showToast({
      //   title: '用户页面开发中',
      //   icon: 'none'
      // });
=======
      // 这里先注释掉，等以后创建了用户页面再启用
      // wx.navigateTo({
      //   url: '/pages/user/user'
      // });
      wx.showToast({
        title: '用户页面开发中',
        icon: 'none'
      });
>>>>>>> 9089c94f1989c686ea88f12a8b8762c991a12855
    }
    // 点击"首页"时，由于已在首页，可以不处理，或者你希望有些效果（比如刷新），可以在这里写。
  },

  goCanteenList() {
<<<<<<< HEAD
    wx.navigateTo({ url: '/pages/canteen/index' })
=======
    wx.navigateTo({ url: '/pages/canteen/canteen' })
>>>>>>> 9089c94f1989c686ea88f12a8b8762c991a12855
  },

  goDishSearch() {
    wx.navigateTo({ url: '/pages/search/index' })
  },

  goIntroDetail() {
    wx.navigateTo({ url: '/pages/intro/index' })
  }
<<<<<<< HEAD
})
=======
})
>>>>>>> 9089c94f1989c686ea88f12a8b8762c991a12855
