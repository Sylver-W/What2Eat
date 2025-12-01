Page({
  onLogin() {
    wx.cloud.callFunction({
      name: "login"
    })
    .then(res => {
      const openId = res.result.openid;
      console.log("用户 openId:", openId);
      wx.showToast({ title: "登录成功" });

      // 跳转首页
      wx.reLaunch({
        url: "/pages/home/home"
      });
    })
    .catch(err => {
      console.error(err);
      wx.showToast({ title: "登录失败", icon: "error" });
    });
  }
})
