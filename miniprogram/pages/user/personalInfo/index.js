Page({
  data: {
    statusBarHeight: 0, // 状态栏高度
    // 性别选择列表
    genderList: ['男', '女', '保密'],
    // 当前性别索引（默认“男”）
    genderIndex: 0,
    // 个人信息数据
    userInfo: {
      nickname: '集锦园热干面',
      gender: '男',
      phone: '19729922849',
      dorm: '沁苑',
      taste: '不吃香菜'
    }
  },

  onLoad() {
    // 获取手机状态栏高度，适配不同设备
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    });
  },

  // 返回上一级页面（个人中心）
  goBack() {
    wx.navigateBack({
      delta: 1 // 返回1级页面
    });
  },

  // 选择头像（后续可对接微信头像选择API）
  chooseAvatar() {
    wx.showToast({
      title: '头像选择功能待实现',
      icon: 'none'
    });
  },

  // 昵称输入变化
  onNicknameChange(e) {
    this.setData({
      'userInfo.nickname': e.detail.value
    });
  },

  // 性别选择变化
  onGenderChange(e) {
    const index = e.detail.value;
    this.setData({
      genderIndex: index,
      'userInfo.gender': this.data.genderList[index]
    });
  },

  // 宿舍区输入变化
  onDormChange(e) {
    this.setData({
      'userInfo.dorm': e.detail.value
    });
  },

  // 个人口味输入变化
  onTasteChange(e) {
    this.setData({
      'userInfo.taste': e.detail.value
    });
  },

  // 保存个人信息
  saveInfo() {
    // 这里可对接后端接口保存数据
    wx.showToast({
      title: '信息保存成功',
      icon: 'success'
    });
    // 保存后返回上一级
    this.goBack();
  }
});