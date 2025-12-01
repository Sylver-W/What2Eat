Page({
  // 返回上一页（主页）
  goBack() {
    wx.navigateBack({
      delta: 1 // 返回层级：1 级（即上一页）
    });
  }
});