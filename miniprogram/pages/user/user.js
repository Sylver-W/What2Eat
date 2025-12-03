Page({
  data: {
    active: 'user',
    // 初始值设为空，引导用户设置
    userAvatar: 'https://picsum.photos/120/120?random=1',
    userNickname: '',
    userPhone: '未绑定手机号',
    favouriteCount: 0,
    commentCount: 0,
    // 可以移除 isAuthorizing 字段
  },

  onLoad() {
    if (wx.cloud) {
      wx.cloud.init({ 
        env: 'cloud1-9gqate3z0c742201',
        traceUser: true
      }) 
    } else {
      wx.showToast({ title: '当前微信版本不支持云开发', icon: 'none' })
    }
    // 页面加载时，从缓存或数据库恢复用户信息
    this.checkUserLogin()
  },

  // 检查登录状态：先读本地缓存，无则调用云函数查询
  checkUserLogin() {
    const cachedUser = wx.getStorageSync('userInfo')
    if (cachedUser) {
      // 【重要】即使缓存存在，也只用它来展示，避免使用“微信用户”等无效值
      this.setData({
        userAvatar: cachedUser.avatarUrl || this.data.userAvatar,
        userNickname: cachedUser.nickname || '', // 如果缓存昵称无效，则留空
        userPhone: cachedUser.phone || '未绑定手机号',
        favouriteCount: cachedUser.favouriteCount || 0,
        commentCount: cachedUser.commentCount || 0
      })
      return
    }

    // 本地无缓存，调用云函数 getuserinfo 查询数据库
    wx.showLoading({ title: '加载中' })
    wx.cloud.callFunction({
      name: 'getuserinfo'
    }).then(res => {
      wx.hideLoading()
      if (res.result.success && res.result.data) {
        const userData = res.result.data
        wx.setStorageSync('userInfo', userData)
        this.setData({
          userAvatar: userData.avatarUrl || this.data.userAvatar,
          userNickname: userData.nickname || '', // 数据库昵称无效则留空
          userPhone: userData.phone || '未绑定手机号',
          favouriteCount: userData.favouriteCount || 0,
          commentCount: userData.commentCount || 0
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('获取用户信息失败：', err)
    })
  },

  // ========== 【新增】处理用户选择头像 ==========
  onChooseAvatar(e) {
    console.log('用户选择了新头像', e.detail)
    const { avatarUrl } = e.detail
    
    // 1. 立即更新页面显示
    this.setData({
      userAvatar: avatarUrl
    })
    
    // 2. 调用云函数，将新头像保存到数据库
    this.updateUserInfoToDB({ avatarUrl: avatarUrl })
  },

  // ========== 【新增】处理用户输入昵称 ==========
  onNicknameInput(e) {
    console.log('用户输入了新昵称', e.detail)
    const nickname = e.detail.value.trim()
    
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    
    // 1. 立即更新页面显示
    this.setData({
      userNickname: nickname
    })
    
    // 2. 调用云函数，将新昵称保存到数据库
    this.updateUserInfoToDB({ nickname: nickname })
  },

  // ========== 【新增】统一更新用户信息到数据库 ==========
  updateUserInfoToDB(updateData) {
    console.log('开始更新用户信息，数据：', updateData)
    wx.showLoading({ title: '保存中' })
    
    wx.cloud.callFunction({
      name: 'updateuserinfo',
      data: updateData
    }).then(res => {
      wx.hideLoading()
      console.log('云函数返回完整结果：', res)
      
      // 【关键修改】弹窗显示完整结果
      if (res.result && res.result.success) {
        console.log('用户信息更新成功', res.result)
        
        const cachedUser = wx.getStorageSync('userInfo') || {}
        Object.assign(cachedUser, updateData)
        wx.setStorageSync('userInfo', cachedUser)
        
        wx.showToast({ title: '保存成功' })
      } else {
        // 显示具体的错误信息
        let errorMsg = '未知错误'
        if (res.result) {
          errorMsg = res.result.message || res.result.error || JSON.stringify(res.result)
        }
        console.error('保存失败详情：', errorMsg)
        
        wx.showModal({
          title: '保存失败详情',
          content: errorMsg,
          showCancel: false
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('调用云函数失败：', err)
      
      wx.showModal({
        title: '网络调用失败',
        content: `错误码: ${err.errCode || '无'}\n错误信息: ${err.errMsg || '未知'}`,
        showCancel: false
      })
    })
  },

  // ========== 【可选】你需要创建一个“updateuserinfo”云函数 ==========
  // 这个云函数类似之前的 saveuserinfo，但只更新传入的字段
  // 你可以复用 saveuserinfo 的代码逻辑，根据传入的字段动态更新

  // 以下原有方法完全保留，无需修改
  goPersonalInfo() {
    wx.navigateTo({ url: '/pages/user/personalInfo/index' })
  },
  goCollectDish() {
    wx.navigateTo({ url: '/pages/user/collectDish/index' })
  },
  goMyComment() {
    wx.navigateTo({ url: '/pages/user/myComment/index' })
  },
  goAddDish() {
    wx.navigateTo({ url: '/pages/user/addDish/index' })
  },
  onChange(event) {
    const name = event.detail;
    console.log('切换到:', name);
    if (name === 'canteen') {
      wx.navigateTo({ url: '/pages/canteen/canteen' });
    } else if (name === 'home') {
      wx.navigateTo({ url: '/pages/index/index' });
    }
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