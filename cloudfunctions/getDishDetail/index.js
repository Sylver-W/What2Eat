// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { dishId, page = 1, pageSize = 10 } = event
    
    if (!dishId) {
      return {
        success: false,
        error: '菜品ID不能为空',
        data: null
      }
    }

    const db = cloud.database()
    
    // 1. 获取菜品详情
    const dishResult = await db.collection('dishes')
      .doc(dishId)
      .get()

    if (!dishResult.data) {
      return {
        success: false,
        error: '菜品不存在',
        data: null
      }
    }

    const dish = dishResult.data
    
    // 2. 处理菜品图片
    let dishImageUrl = '/images/dish1.jpg'
    if (dish.images && dish.images.length > 0 && dish.images[0]) {
      const imageUrl = dish.images[0]
      if (imageUrl.startsWith('cloud://')) {
        try {
          const tempUrlResult = await cloud.getTempFileURL({
            fileList: [imageUrl]
          })
          if (tempUrlResult.fileList && tempUrlResult.fileList[0]) {
            dishImageUrl = tempUrlResult.fileList[0].tempFileURL
          }
        } catch (error) {
          console.error('获取菜品图片失败:', error)
        }
      } else {
        dishImageUrl = imageUrl
      }
    }

    // 3. 获取评论
    const commentsResult = await db.collection('comments')
      .where({
        dishId: dishId
      })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 4. 获取评论总数
    const countResult = await db.collection('comments')
      .where({
        dishId: dishId
      })
      .count()

    // 5. 处理评论中的用户头像
    let comments = commentsResult.data || []
    
    // 收集所有需要处理的头像URL
    const avatarFileIDs = comments
      .filter(comment => comment.userAvatar && comment.userAvatar.startsWith('cloud://'))
      .map(comment => comment.userAvatar)

    if (avatarFileIDs.length > 0) {
      const avatarUrlsResult = await cloud.getTempFileURL({
        fileList: avatarFileIDs
      })

      const avatarUrlMap = new Map()
      if (avatarUrlsResult.fileList) {
        avatarUrlsResult.fileList.forEach(item => {
          avatarUrlMap.set(item.fileID, item.tempFileURL)
        })
      }

      // 替换评论中的头像URL
      comments = comments.map(comment => {
        if (comment.userAvatar && comment.userAvatar.startsWith('cloud://')) {
          return {
            ...comment,
            userAvatar: avatarUrlMap.get(comment.userAvatar) || '/images/default-avatar.png'
          }
        }
        return comment
      })
    }

    // 6. 计算平均评分（如果菜品没有评论，使用原有评分）
    let averageRating = dish.rating || 4.0
    if (countResult.total > 0) {
      const ratingSum = comments.reduce((sum, comment) => sum + (comment.rating || 0), 0)
      averageRating = (ratingSum / comments.length).toFixed(1)
    }

    return {
      success: true,
      data: {
        dish: {
          ...dish,
          imageUrl: dishImageUrl,
          averageRating: parseFloat(averageRating)
        },
        comments: comments,
        totalComments: countResult.total,
        hasMoreComments: comments.length === pageSize
      }
    }

  } catch (error) {
    console.error('获取菜品详情失败:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}