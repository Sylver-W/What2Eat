Page({
  data:{
    active: 'user',
  },
  // 跳转到个人资料（路径：/pages/user/personalInfo/index）
  goPersonalInfo() {
    wx.navigateTo({
      url: '/pages/user/personalInfo/index'
    })
  },

  // 跳转到收藏菜品
  goCollectDish() {
    wx.navigateTo({
      url: '/pages/user/collectDish/index'
    })
  },

  // 跳转到我的评价
  goMyComment() {
    wx.navigateTo({
      url: '/pages/user/myComment/index'
    })
  },

  // 跳转到菜品补充
  goAddDish() {
    wx.navigateTo({
      url: '/pages/user/addDish/index'
    })
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
    } else if (name === 'home') {
      wx.navigateTo({
        url: '/pages/index/index'
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