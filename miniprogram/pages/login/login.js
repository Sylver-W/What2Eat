const app = getApp();

Page({
  data: {
    loading: false
  },
  handleLogin() {
    if (this.data.loading) {
      return;
    }
    this.setData({ loading: true });
    wx.getUserProfile({
      desc: '用于完善校园饮食资料',
      success: profileRes => {
        const userProfile = profileRes.userInfo;
        wx.cloud.callFunction({
          name: 'login'
        }).then(loginRes => {
          const openid = loginRes.result.openid;
          app.globalData.openid = openid;
          wx.cloud.callFunction({
            name: 'getUserInfo',
            data: { openid }
          }).then(userRes => {
            const result = userRes.result;
            if (result && result.exists) {
              const userInfo = {
                ...result.user,
                ...userProfile
              };
              app.globalData.userInfo = userInfo;
              app.globalData.role = userInfo.role || 'user';
              wx.setStorageSync('userInfo', userInfo);
              wx.reLaunch({ url: '/pages/index/index' });
            } else {
              wx.setStorageSync('tempProfile', { openid, userProfile });
              wx.navigateTo({ url: '/pages/register/register' });
            }
          }).catch(err => {
            console.error('获取用户信息失败', err);
            wx.showToast({ title: '登录失败', icon: 'error' });
          }).finally(() => {
            this.setData({ loading: false });
          });
        }).catch(err => {
          console.error('登录云函数失败', err);
          wx.showToast({ title: '登录失败', icon: 'error' });
          this.setData({ loading: false });
        });
      },
      fail: () => {
        wx.showToast({ title: '需要授权才能使用', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  }
});
