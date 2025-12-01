/**
 * 云函数统一调用工具
 * 
 * 后端返回格式约定为：
 * {
 *   code: 0,       // 成功
 *   data: {...},   // 数据
 *   msg: "错误信息" // 失败时
 * }
 */

function request(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        const result = res.result;

        if (!result) {
          wx.showToast({ title: "无返回数据", icon: "none" });
          return reject("no_result");
        }

        // 成功
        if (result.code === 0) {
          resolve(result.data);
        } else {
          // 后端错误
          wx.showToast({
            title: result.msg || "请求失败",
            icon: "none"
          });
          reject(result);
        }
      },

      fail: err => {
        // 云函数调用失败
        console.error("cloud call error:", err);
        wx.showToast({ title: "网络错误", icon: "none" });
        reject(err);
      }
    });
  });
}

module.exports = {
  request
};
