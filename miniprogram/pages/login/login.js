const db = wx.cloud.database()

Page({
  onLogin() {
    wx.showLoading({ title: '登录中...' })

    wx.cloud.callFunction({
      name: "login",
      success: async res => {
        const openid = res.result.openid

        // 查询数据库是否已有用户
        const user = await db.collection("user").where({
          _id: openid
        }).get()

        if (user.data.length > 0) {
          // 用户已存在 → 直接登录成功
          console.log("success")
          this.finishLogin(openid, user.data[0])
        } else {
          // 新用户 → 跳转到完善资料页面
          wx.hideLoading()
          wx.navigateTo({
            url: `/pages/logininfo/logininfo?openid=${openid}`
          })
        }
      },
      fail: err => {
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  // 登录成功处理
  finishLogin(openid, userInfo) {
    wx.setStorageSync("openid", openid)
    wx.setStorageSync("userInfo", userInfo)
    getApp().globalData.openid = openid
    getApp().globalData.userInfo = userInfo
    wx.hideLoading()
    console.log(getCurrentPages())
    wx.reLaunch({
      url: '/pages/user/user',
    })
  }
})
