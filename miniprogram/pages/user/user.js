Page({
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
  }
})