const app = getApp();

Page({
  data: {
    form: {
      nickname: '',
      phone: '',
      role: 'user'
    },
    submitting: false
  },
  onLoad() {
    const temp = wx.getStorageSync('tempProfile');
    if (!temp) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    const nickname = temp.userProfile.nickName || '';
    this.setData({
      form: {
        ...this.data.form,
        nickname
      }
    });
  },
  onFieldChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail
    });
  },
  onRoleChange(event) {
    this.setData({ 'form.role': event.detail });
  },
  handleSubmit() {
    if (this.data.submitting) return;
    if (!this.data.form.nickname) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const temp = wx.getStorageSync('tempProfile');
    wx.cloud.callFunction({
      name: 'registerUser',
      data: {
        openid: temp.openid,
        nickname: this.data.form.nickname,
        avatar: temp.userProfile.avatarUrl,
        role: this.data.form.role,
        phone: this.data.form.phone
      }
    }).then(res => {
      const userInfo = {
        openid: temp.openid,
        nickname: this.data.form.nickname,
        avatarUrl: temp.userProfile.avatarUrl,
        role: this.data.form.role,
        phone: this.data.form.phone
      };
      app.globalData.userInfo = userInfo;
      app.globalData.openid = temp.openid;
      app.globalData.role = this.data.form.role;
      wx.setStorageSync('userInfo', userInfo);
      wx.removeStorageSync('tempProfile');
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 500);
    }).catch(err => {
      console.error('注册失败', err);
      wx.showToast({ title: '注册失败', icon: 'error' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  }
});
