// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { dishes } = event
    
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return {
        success: false,
        error: 'dishes参数不能为空且必须为数组',
        data: []
      }
    }

    // 提取所有需要处理的图片文件ID
    const fileIDs = []
    const dishMap = new Map() // 用于存储菜品和图片的映射关系
    
    dishes.forEach((dish, index) => {
      if (dish.images && Array.isArray(dish.images) && dish.images.length > 0) {
        const imageUrl = dish.images[0] // 只取第一张图片
        if (imageUrl && imageUrl.startsWith('cloud://')) {
          fileIDs.push(imageUrl)
          dishMap.set(index, {
            dishId: dish._id || dish.dishId,
            fileID: imageUrl
          })
        }
      }
    })

    // 如果没有云存储图片，直接返回原始数据
    if (fileIDs.length === 0) {
      return {
        success: true,
        data: dishes.map(dish => ({
          ...dish,
          imageUrl: (dish.images && dish.images[0]) || '/images/dish1.jpg'
        }))
      }
    }

    // 批量获取临时URL
    const result = await cloud.getTempFileURL({
      fileList: fileIDs
    })

    // 构建URL映射表
    const urlMap = new Map()
    if (result.fileList && Array.isArray(result.fileList)) {
      result.fileList.forEach(item => {
        if (item.tempFileURL) {
          urlMap.set(item.fileID, item.tempFileURL)
        }
      })
    }

    // 处理菜品数据，替换图片URL
    const processedDishes = dishes.map((dish, index) => {
      let imageUrl = '/images/dish1.jpg' // 默认图片
      
      if (dish.images && Array.isArray(dish.images) && dish.images.length > 0) {
        const originalImageUrl = dish.images[0]
        
        if (originalImageUrl && originalImageUrl.startsWith('cloud://')) {
          // 获取转换后的URL
          imageUrl = urlMap.get(originalImageUrl) || '/images/dish1.jpg'
        } else if (originalImageUrl) {
          // 如果不是云存储路径，直接使用
          imageUrl = originalImageUrl
        }
      }
      
      return {
        ...dish,
        imageUrl: imageUrl
      }
    })

    return {
      success: true,
      data: processedDishes
    }

  } catch (error) {
    console.error('云函数错误:', error)
    
    // 即使出错，也返回默认数据的菜品
    const processedDishes = event.dishes.map(dish => ({
      ...dish,
      imageUrl: (dish.images && dish.images[0]) || '/images/dish1.jpg'
    }))
    
    return {
      success: false,
      error: error.message,
      data: processedDishes
    }
  }
}