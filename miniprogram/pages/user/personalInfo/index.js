// personalInfo/index.js - 完整修改版
Page({
  data: {
    userInfo: {
      nickname: '',
      avatarUrl: '',
      gender: 0,
      phone: '',
      dormArea: '',
      tastePreferences: '',
      city: '',
      province: ''
    },
    genderOptions: ['未知', '男', '女'],
    isLoading: true
  },

  // 页面加载时获取用户信息
  onLoad() {
    this.getUserProfile()
  },

  // 调用云函数：获取用户当前信息
  getUserProfile() {
    this.setData({ isLoading: true })
    
    // 先尝试从本地缓存获取
    const cachedUser = wx.getStorageSync('userInfo')
    if (cachedUser) {
      console.log('从缓存加载用户信息:', cachedUser)
      this.setData({ 
        userInfo: { ...this.data.userInfo, ...cachedUser },
        isLoading: false
      })
    }
    
    // 再从云端获取最新数据
    wx.cloud.callFunction({
      name: 'getuserinfo'
    }).then(res => {
      this.setData({ isLoading: false })
      
      if (res.result.success && res.result.data) {
        const userData = res.result.data
        console.log('从云端加载用户信息:', userData)
        
        // 合并数据，确保所有字段都有值
        const mergedData = {
          nickname: userData.nickname || '',
          avatarUrl: userData.avatarUrl || '',
          gender: userData.gender || 0,
          phone: userData.phone || '',
          dormArea: userData.dormArea || '',
          tastePreferences: userData.tastePreferences || '',
          city: userData.city || '',
          province: userData.province || ''
        }
        
        this.setData({ userInfo: mergedData })
        
        // 更新本地缓存
        wx.setStorageSync('userInfo', { ...cachedUser, ...mergedData })
        
      } else if (!cachedUser) {
        wx.showToast({ 
          title: '获取信息失败，请返回重试', 
          icon: 'none',
          duration: 2000
        })
      }
    }).catch(err => {
      this.setData({ isLoading: false })
      console.error('获取用户信息失败：', err)
      
      if (!cachedUser) {
        wx.showToast({ 
          title: '网络错误，请检查连接', 
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 选择并上传新头像
  chooseAvatar() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        wx.showLoading({ title: '上传中' })
        
        const tempFilePath = res.tempFilePaths[0]
        const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success(uploadRes) {
            wx.hideLoading()
            
            // 获取临时文件URL（有效期4小时）
            const fileID = uploadRes.fileID
            console.log('头像上传成功:', fileID)
            
            // 立即更新页面显示
            that.setData({ 
              'userInfo.avatarUrl': fileID
            })
            
            // 自动保存到数据库
            that.updateUserInfoToDB({ avatarUrl: fileID })
            
            wx.showToast({ 
              title: '头像更新成功',
              icon: 'success',
              duration: 1500
            })
          },
          fail(uploadErr) {
            wx.hideLoading()
            console.error('头像上传失败:', uploadErr)
            wx.showToast({ 
              title: '上传失败，请重试', 
              icon: 'none',
              duration: 2000
            })
          }
        })
      },
      fail() {
        wx.showToast({ 
          title: '取消选择', 
          icon: 'none',
          duration: 1000
        })
      }
    })
  },

  // 昵称输入绑定
  onNicknameChange(e) {
    this.setData({ 'userInfo.nickname': e.detail.value })
  },

  // 性别选择绑定
  onGenderChange(e) {
    this.setData({ 
      'userInfo.gender': parseInt(e.detail.value) || 0
    })
  },

  // 手机号输入绑定
  onPhoneChange(e) {
    this.setData({ 'userInfo.phone': e.detail.value })
  },

  // 宿舍区输入绑定
  onDormChange(e) {
    this.setData({ 'userInfo.dormArea': e.detail.value })
  },

  // 口味偏好输入绑定
  onTasteChange(e) {
    this.setData({ 'userInfo.tastePreferences': e.detail.value })
  },
  
  // 辅助方法：更新单个字段到数据库
  updateUserInfoToDB(updateData) {
    wx.cloud.callFunction({
      name: 'updateuserinfo',
      data: updateData
    }).then(res => {
      if (res.result && res.result.success) {
        console.log('字段更新成功:', updateData)
        // 更新本地缓存
        const cachedUser = wx.getStorageSync('userInfo') || {}
        wx.setStorageSync('userInfo', { ...cachedUser, ...updateData })
      }
    }).catch(err => {
      console.error('字段更新失败:', err)
    })
  },

  // 保存个人资料（调用云函数更新）
  saveProfile() {
    const { nickname, phone } = this.data.userInfo
    
    // 简单校验
    if (!nickname || nickname.trim() === '') {
      return wx.showToast({ 
        title: '昵称不能为空', 
        icon: 'none',
        duration: 2000
      })
    }
    
    if (phone && phone.trim() !== '') {
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(phone.trim())) {
        return wx.showToast({ 
          title: '手机号格式错误', 
          icon: 'none',
          duration: 2000
        })
      }
    }
    
    wx.showLoading({ title: '保存中' })
    
    // 准备要保存的数据
    const saveData = {
      nickname: nickname.trim(),
      avatarUrl: this.data.userInfo.avatarUrl || '',
      gender: this.data.userInfo.gender || 0,
      phone: (this.data.userInfo.phone || '').trim(),
      dormArea: (this.data.userInfo.dormArea || '').trim(),
      tastePreferences: (this.data.userInfo.tastePreferences || '').trim(),
      city: this.data.userInfo.city || '',
      province: this.data.userInfo.province || ''
    }
    
    console.log('保存的数据:', saveData)
    
    wx.cloud.callFunction({
      name: 'updateuserinfo',
      data: saveData
    }).then(res => {
      wx.hideLoading()
      
      if (res.result && res.result.success) {
        wx.showToast({ 
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })
        
        // 更新本地缓存
        wx.setStorageSync('userInfo', { 
          ...wx.getStorageSync('userInfo'),
          ...saveData
        })
        
        // 延迟返回，让用户看到保存成功的提示
        setTimeout(() => {
          // 返回上一页并刷新“我的”页面
          const pages = getCurrentPages()
          if (pages.length > 1) {
            const prevPage = pages[pages.length - 2]
            if (prevPage && prevPage.checkUserLogin) {
              prevPage.checkUserLogin()
            }
          }
          wx.navigateBack({ delta: 1 })
        }, 1500)
        
      } else {
        wx.showToast({ 
          title: '保存失败: ' + (res.result?.message || '未知错误'), 
          icon: 'none',
          duration: 3000
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('保存用户信息失败：', err)
      wx.showToast({ 
        title: '网络错误，请重试', 
        icon: 'none',
        duration: 2000
      })
    })
  },
  
  // 页面卸载时清理
  onUnload() {
    // 可以在这里做一些清理工作
  }
})