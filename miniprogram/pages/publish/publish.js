const app = getApp();

Page({
  data: {
    form: {
      name: '',
      canteen: '',
      price: '',
      tags: '',
      supplyTime: ''
    },
    fileList: [],
    imageUrl: '',
    submitting: false
  },
  onFieldChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail });
  },
  afterRead(event) {
    const { file } = event.detail;
    const cloudPath = `dishes/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
    wx.showLoading({ title: '上传中' });
    wx.cloud.uploadFile({
      cloudPath,
      filePath: file.url
    }).then(res => {
      this.setData({
        fileList: [{ ...file, url: res.fileID }],
        imageUrl: res.fileID
      });
      wx.hideLoading();
    }).catch(err => {
      console.error('上传图片失败', err);
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'error' });
    });
  },
  onDelete() {
    this.setData({ fileList: [], imageUrl: '' });
  },
  handleSubmit() {
    if (this.data.submitting) return;
    const { name, canteen, price, tags, supplyTime } = this.data.form;
    if (!name || !canteen || !price || !this.data.imageUrl) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const tagArr = tags ? tags.split(/[，,]/).map(t => t.trim()).filter(Boolean) : [];
    wx.cloud.callFunction({
      name: 'addDish',
      data: {
        name,
        canteen,
        price: Number(price),
        tags: tagArr,
        supplyTime,
        image: this.data.imageUrl,
        uploader: app.globalData.openid,
        status: 'pending'
      }
    }).then(() => {
      wx.showToast({ title: '上传成功，等待审核', icon: 'success' });
      this.setData({
        form: { name: '', canteen: '', price: '', tags: '', supplyTime: '' },
        fileList: [],
        imageUrl: ''
      });
    }).catch(err => {
      console.error('提交菜品失败', err);
      wx.showToast({ title: '提交失败', icon: 'error' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  }
});
