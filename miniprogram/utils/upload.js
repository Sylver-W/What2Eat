// miniprogram/utils/upload.js
// 根据文件路径简单取后缀名
function getExtFromPath(path) {
  const dotIndex = path.lastIndexOf('.')
  if (dotIndex === -1) return '.png'
  return path.slice(dotIndex)
}

/**
 * 上传单张图片到云存储
 * @param {string} filePath 本地临时路径（http://tmp/ 或 wxfile://tmp_）
 * @param {string} folder  存储文件夹（如 "avatar"、"dish"）
 * @returns {Promise<string>} 上传成功后返回 fileID
 */
function uploadSingleImage(filePath, folder = 'images') {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject(new Error('filePath 为空'))
      return
    }
    const ext = getExtFromPath(filePath)
    const cloudPath = `${folder}/` + Date.now() + '_' + Math.floor(Math.random() * 100000) + ext
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        resolve(res.fileID)
      },
      fail: err => {
        reject(err)
      }
    })
  })
}
/**
 * 若已是 cloud:// 或 http(s)://，直接返回；
 * 若是本地 tmp 路径，则上传后返回 fileID
 */
function uploadIfNeeded(src, folder = 'images') {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('图片地址为空'))
      return
    }

    // 已经是云文件或网络 URL 的情况，直接用
    if (src.startsWith('cloud://') ) {
      resolve(src)
      return
    }

    // 否则视为本地临时路径，走上传流程
    uploadSingleImage(src, folder)
      .then(fileID => resolve(fileID))
      .catch(reject)
  })
}

module.exports = {
  uploadSingleImage,
  uploadIfNeeded
}
