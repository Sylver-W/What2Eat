import { request } from "../../utils/request";
import regeneratorRuntime from '../../utils/runtime';
Page({
  data: {
    searchValue: '',
    canteens: []
  },
  onLoad() {
    console.log('食堂介绍加载');
    this.loadCanteens();
  },

  async loadCanteens(){
    try {
      const list = await request("getcanteenlist");
      this.setData({
        canteens: list
      });
    } catch (err) {
      console.error("获取食堂失败:", err);
    }
  },
  // 返回上一页（主页）
  goBack() {
    wx.navigateBack({
      delta: 1 // 返回层级：1 级（即上一页）
    });
  }
});