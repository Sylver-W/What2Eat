Page({
  data: {
    dishName: '',
    canteenOptions: [], // [{canteenId: 1, name: '食堂一楼'}]
    canteenIndex: -1,
    price: '',
    description: '',
    images: [],
    // 预设标签
    availableTags: ['招牌', '辣味', '清淡', '汤类', '面食', '米饭', '早餐', '快餐', '甜点', '饮品', '热销', '新品', '套餐', '健康', '素食', '肉食', '海鲜', '小吃', '宵夜', '营养'],
    selectedTags: [], // 用户选择的标签
    customTagInput: '', // 自定义标签输入
    isSubmitting: false,
    canSubmit: false
  },

  onLoad() {
    this.loadCanteenOptions();
  },

  onShow() {
    this.checkFormValid();
  },

  // 加载食堂选项
  loadCanteenOptions() {
    wx.showLoading({ title: '加载中' });
    
    wx.cloud.callFunction({
      name: 'getcanteenlist'
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        // 转换数据格式，只保留需要的字段
        this.setData({
          canteenOptions: res.result.data.map(canteen => ({
            canteenId: canteen.canteenId,
            name: canteen.name
          }))
        });
      } else {
        wx.showToast({
          title: res.result.msg || '加载食堂列表失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载食堂失败:', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 菜品名输入
  onDishNameInput(e) {
    this.setData({ dishName: e.detail.value });
    this.checkFormValid();
  },

  // 食堂选择
  onCanteenChange(e) {
    this.setData({ canteenIndex: e.detail.value });
    this.checkFormValid();
  },

  // 价格输入
  onPriceInput(e) {
    let value = e.detail.value;
    // 清除非数字和点的字符
    value = value.replace(/[^\d.]/g, '');
    
    // 限制小数位数
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2);
      }
    }
    
    // 限制整数部分不超过3位
    const intPart = value.split('.')[0];
    if (intPart && intPart.length > 3) {
      value = intPart.slice(0, 3) + (value.includes('.') ? '.' + value.split('.')[1] : '');
    }
    
    this.setData({ price: value });
    this.checkFormValid();
  },

  // 描述输入
  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
    this.checkFormValid();
  },

  // 切换预设标签
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const { selectedTags } = this.data;
    
    // 如果标签已选中，则取消选中
    if (selectedTags.includes(tag)) {
      const newTags = selectedTags.filter(t => t !== tag);
      this.setData({ selectedTags: newTags });
    } 
    // 如果未选中且未达到限制，则选中（限制最多6个标签）
    else if (selectedTags.length < 6) {
      this.setData({ 
        selectedTags: [...selectedTags, tag]
      });
    } else {
      wx.showToast({
        title: '最多选择6个标签',
        icon: 'none',
        duration: 1500
      });
    }
  },

  // 自定义标签输入
  onCustomTagInput(e) {
    this.setData({ customTagInput: e.detail.value });
  },

  // 添加自定义标签
  addCustomTag() {
    const { customTagInput, selectedTags, availableTags } = this.data;
    const tag = customTagInput.trim();
    
    if (!tag) {
      wx.showToast({
        title: '请输入标签内容',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    if (tag.length > 4) {
      wx.showToast({
        title: '标签最多4个字',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 检查是否已存在
    if (selectedTags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 检查是否达到限制
    if (selectedTags.length >= 6) {
      wx.showToast({
        title: '最多选择6个标签',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 添加自定义标签到已选列表
    this.setData({ 
      selectedTags: [...selectedTags, tag],
      customTagInput: ''  // 清空输入框
    });
    
    // 如果自定义标签不在预设标签中，添加到预设标签（便于下次选择）
    if (!availableTags.includes(tag)) {
      this.setData({
        availableTags: [...availableTags, tag]
      });
    }
  },

  // 移除已选标签
  removeSelectedTag(e) {
    const index = e.currentTarget.dataset.index;
    const { selectedTags } = this.data;
    
    selectedTags.splice(index, 1);
    this.setData({ selectedTags });
  },

  // 选择图片
  chooseImage() {
    const { images } = this.data;
    const remaining = 3 - images.length;
    
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          images: [...images, ...tempFiles]
        });
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    images.splice(index, 1);
    this.setData({ images });
  },

  // 检查表单是否有效
  checkFormValid() {
    const { dishName, canteenIndex, price, description } = this.data;
    const priceNum = parseFloat(price);
    const isValid = dishName.trim() && 
                   canteenIndex !== -1 && 
                   price.trim() && 
                   !isNaN(priceNum) && 
                   priceNum > 0 && 
                   priceNum <= 999 &&
                   description.trim() && 
                   description.trim().length >= 5;
    
    this.setData({ canSubmit: isValid });
  },

  // 表单验证
  validateForm() {
    const { dishName, canteenIndex, price, description } = this.data;
    const errors = [];

    if (!dishName.trim()) {
      errors.push('请输入菜品名');
    } else if (dishName.trim().length > 20) {
      errors.push('菜品名不能超过20个字');
    }

    if (canteenIndex === -1) {
      errors.push('请选择食堂');
    }

    const priceNum = parseFloat(price);
    if (!price.trim()) {
      errors.push('请输入价格');
    } else if (isNaN(priceNum)) {
      errors.push('请输入有效的价格');
    } else if (priceNum <= 0) {
      errors.push('价格必须大于0元');
    } else if (priceNum > 999) {
      errors.push('价格不能超过999元');
    }

    if (!description.trim()) {
      errors.push('请输入菜品介绍');
    } else if (description.trim().length < 5) {
      errors.push('菜品介绍至少5个字');
    }

    return errors;
  },

  // 提交菜品建议
  async onSubmit() {
    // 防止重复提交
    if (this.data.isSubmitting) return;
    
    const errors = this.validateForm();
    if (errors.length > 0) {
      wx.showToast({
        title: errors[0],
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中', mask: true });

    try {
      const { dishName, canteenOptions, canteenIndex, price, description, images, selectedTags } = this.data;
      const selectedCanteen = canteenOptions[canteenIndex];

      // 1. 上传图片到云存储
      const imageUrls = await this.uploadImages(images);

      // 2. 调用云函数提交数据
      const result = await wx.cloud.callFunction({
        name: 'adddish',
        data: {
          dishName: dishName.trim(),
          canteenId: selectedCanteen.canteenId,
          canteenName: selectedCanteen.name,
          price: parseFloat(price),
          description: description.trim(),
          images: imageUrls,
          tags: selectedTags, // 传递选中的标签
          createTime: new Date()
        }
      });

      wx.hideLoading();
      this.setData({ isSubmitting: false });

      if (result.result.code === 0) {
        // 提交成功
        this.showSuccessDialog(result.result.data);
      } else {
        wx.showToast({
          title: result.result.msg || '提交失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
      console.error('提交失败:', error);
      wx.showToast({
        title: '提交失败，请检查网络后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 上传图片到云存储
  uploadImages(images) {
    if (!images || images.length === 0) return Promise.resolve([]);

    const uploadTasks = images.map((img, index) => {
      return new Promise((resolve, reject) => {
        // 生成唯一的文件名
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const cloudPath = `newdish/${timestamp}_${random}_${index}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath,
          filePath: img,
          success: (res) => {
            resolve(res.fileID);
          },
          fail: (err) => {
            console.error(`图片${index + 1}上传失败:`, err);
            reject(new Error(`图片上传失败: ${err.errMsg}`));
          }
        });
      });
    });

    return Promise.all(uploadTasks);
  },

  // 显示成功弹窗
  showSuccessDialog(data) {
    wx.showModal({
      title: '提交成功',
      content: '感谢您的补充建议！我们会尽快审核，审核通过后将展示在菜品列表中。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#07c160',
      success: () => {
        // 清空表单
        this.resetForm();
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack();
        }, 500);
      }
    });
  },

  // 重置表单
  resetForm() {
    this.setData({
      dishName: '',
      canteenIndex: -1,
      price: '',
      description: '',
      images: [],
      selectedTags: [],
      customTagInput: '',
      canSubmit: false,
      isSubmitting: false
    });
  }
});
