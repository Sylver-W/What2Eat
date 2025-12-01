// pages/search/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    query: '',
    autoFocus: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载时自动聚焦到输入框
    this.setData({
      autoFocus: true
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次页面显示时重新聚焦
    this.setData({
      autoFocus: true
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 输入内容变化
   */
  onInputChange(e) {
    this.setData({
      query: e.detail.value.trim()
    });
  },

  /**
   * 清除输入内容
   */
  onClearInput() {
    // 清除按钮一直显示，所以需要检查是否有内容可清除
    if (this.data.query) {
      this.setData({
        query: '',
        autoFocus: true
      });
    }
  },

  /**
   * 取消按钮点击事件
   */
  onCancel() {
    // 清空输入框
    this.setData({
      query: ''
    });
    
    // 隐藏键盘
    wx.hideKeyboard();
  },

  /**
   * 执行查询（回车键触发）
   */
  onSearch() {
    const query = this.data.query;
    
    // 如果查询内容为空，显示提示
    if (!query) {
      wx.showToast({
        title: '请输入查询内容',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '查询中...',
      mask: true
    });
    
    // 模拟网络请求延迟
    setTimeout(() => {
      wx.hideLoading();
      
      // 显示查询结果
      wx.showModal({
        title: '查询结果',
        content: `您查询的内容是："${query}"\n\n这是一个示例响应，实际应用中这里会返回真实的查询结果。`,
        showCancel: false,
        confirmText: '确定',
        success: (res) => {
          // 清空输入框并重新聚焦
          this.setData({
            query: '',
            autoFocus: true
          });
        }
      });
    }, 1000);
  }

})