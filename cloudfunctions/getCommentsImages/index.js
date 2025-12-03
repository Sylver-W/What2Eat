// cloudfunctions/getCommentsImages/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { comments = [], dishes = [] } = event
    
    console.log('收到请求，comments数量:', comments.length, 'dishes数量:', dishes.length)
    
    // 收集所有需要转换的云存储路径
    const cloudFileIDs = []
    
    // 收集评论头像
    comments.forEach((comment, index) => {
      if (comment.userAvatar && comment.userAvatar.startsWith('cloud://')) {
        cloudFileIDs.push(comment.userAvatar)
      }
    })
    
    // 收集菜品图片
    dishes.forEach((dish, index) => {
      if (dish.images && Array.isArray(dish.images) && dish.images.length > 0) {
        const imageUrl = dish.images[0]
        if (imageUrl && imageUrl.startsWith('cloud://')) {
          cloudFileIDs.push(imageUrl)
        }
      }
      // 也检查 dish.image1, image2, image3 字段
      if (dish.image1 && dish.image1.startsWith('cloud://')) {
        cloudFileIDs.push(dish.image1)
      }
      if (dish.image2 && dish.image2.startsWith('cloud://')) {
        cloudFileIDs.push(dish.image2)
      }
      if (dish.image3 && dish.image3.startsWith('cloud://')) {
        cloudFileIDs.push(dish.image3)
      }
    })
    
    // 去重
    const uniqueFileIDs = [...new Set(cloudFileIDs)]
    console.log('需要处理的云存储文件数量:', uniqueFileIDs.length)
    
    let urlMap = new Map()
    
    // 如果有云存储文件需要处理
    if (uniqueFileIDs.length > 0) {
      try {
        const result = await cloud.getTempFileURL({
          fileList: uniqueFileIDs
        })
        
        console.log('获取临时URL结果:', result)
        
        if (result.fileList && Array.isArray(result.fileList)) {
          result.fileList.forEach(item => {
            if (item.tempFileURL) {
              urlMap.set(item.fileID, item.tempFileURL)
            }
          })
        }
      } catch (fileError) {
        console.error('获取临时URL失败:', fileError)
        // 尝试备用方法：手动构造URL
        uniqueFileIDs.forEach(fileID => {
          try {
            const match = fileID.match(/cloud:\/\/([^\/]+)\/(.+)/)
            if (match) {
              const envId = match[1]
              const filePath = match[2]
              const envParts = envId.split('.')
              const realEnvId = envParts[0]
              const tempUrl = `https://${realEnvId}.tcb.qcloud.la/${filePath}`
              urlMap.set(fileID, tempUrl)
            }
          } catch (parseError) {
            console.error('解析云存储路径失败:', parseError)
          }
        })
      }
    }
    
    // 处理评论数据
    const processedComments = comments.map(comment => {
      let userAvatar = comment.userAvatar || '/images/default-avatar.png'
      
      if (comment.userAvatar && comment.userAvatar.startsWith('cloud://')) {
        userAvatar = urlMap.get(comment.userAvatar) || '/images/default-avatar.png'
      }
      
      return {
        ...comment,
        userAvatar: userAvatar
      }
    })
    
    // 处理菜品数据
    const processedDishes = dishes.map(dish => {
      let imageUrl = '/images/dish1.jpg'
      
      // 优先使用 images 数组
      if (dish.images && Array.isArray(dish.images) && dish.images.length > 0) {
        const originalImageUrl = dish.images[0]
        if (originalImageUrl) {
          if (originalImageUrl.startsWith('cloud://')) {
            imageUrl = urlMap.get(originalImageUrl) || '/images/dish1.jpg'
          } else {
            imageUrl = originalImageUrl
          }
        }
      }
      // 其次尝试 image1
      else if (dish.image1 && dish.image1.trim() !== '') {
        if (dish.image1.startsWith('cloud://')) {
          imageUrl = urlMap.get(dish.image1) || '/images/dish1.jpg'
        } else {
          imageUrl = dish.image1
        }
      }
      
      return {
        ...dish,
        imageUrl: imageUrl
      }
    })
    
    return {
      success: true,
      message: '图片处理成功',
      data: {
        comments: processedComments,
        dishes: processedDishes
      },
      requestId: wxContext.REQUEST_ID
    }
    
  } catch (error) {
    console.error('云函数执行错误:', error)
    
    // 即使出错也要返回可用的数据
    const fallbackComments = comments.map(comment => ({
      ...comment,
      userAvatar: comment.userAvatar || '/images/default-avatar.png'
    }))
    
    const fallbackDishes = dishes.map(dish => {
      let imageUrl = '/images/dish1.jpg'
      if (dish.images && Array.isArray(dish.images) && dish.images[0]) {
        imageUrl = dish.images[0]
      } else if (dish.image1) {
        imageUrl = dish.image1
      }
      return {
        ...dish,
        imageUrl: imageUrl
      }
    })
    
    return {
      success: false,
      error: error.message,
      data: {
        comments: fallbackComments,
        dishes: fallbackDishes
      },
      requestId: wxContext.REQUEST_ID
    }
  }
}