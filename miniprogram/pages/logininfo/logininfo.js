// loginInfo.js
const { uploadIfNeeded } = require('../../utils/upload.js')
const db = wx.cloud.database()
Page({
  data: {
    avatar: "../../images/default-avatar.png",
    nickname: "",
    openid: ""
  },

  onLoad(options) {
    this.setData({
      openid: options.openid
    })
  },
  // 头像选择
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    this.setData({ avatar: avatarUrl })
  },
  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  // 保存到云端（调用云函数）
  async onSubmit() {
    if (!this.data.nickname) {
      wx.showToast({
        title: "请输入昵称",
        icon: "none"
      })
      return
    }
    wx.showLoading({ title: "提交中..." })
    try {
      // 1. 统一处理头像：
      const finalAvatar = await uploadIfNeeded(this.data.avatar, 'avatars')

      // 2. 调用云函数写入用户信息
      const res = await wx.cloud.callFunction({
        name: "registeruser",
        data: {
          avatar: finalAvatar,
          nickname: this.data.nickname
        }
      })

      wx.hideLoading()
      console.log("registeruser 返回：", res)

      if (!res.result || !res.result.success) {
        wx.showToast({
          title: "注册失败：" + (res.result && res.result.error ? res.result.error : "未知错误"),
          icon: "none"
        })
        return
      }

      wx.setStorageSync("openid", res.result.openid)
      const user = await db.collection("user").where({
        _id: res.result.openid
      }).get()
      wx.setStorageSync("userInfo",user.data[0])
      getApp().globalData.openid = res.result.openid
      getApp().globalData.userInfo = user.data[0] 
      wx.showToast({ title: "注册成功", icon: "success" })
      setTimeout(() => wx.reLaunch({url:'/pages/user/user'}), 500)

    } catch (err) {
      wx.hideLoading()
      console.error("提交失败：", err)
      wx.showToast({
        title: "提交失败：" + (err.errMsg || err.message || "未知错误"),
        icon: "none"
      })
    }
  }
})
