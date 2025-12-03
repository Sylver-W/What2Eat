// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { dishId, rating, content, images = [] } = event
    const wxContext = cloud.getWXContext()
    
    if (!dishId) {
      return {
        success: false,
        error: '菜品ID不能为空'
      }
    }

    if (!rating || rating < 0.5 || rating > 5) {
      return {
        success: false,
        error: '请选择1-5星的评分'
      }
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: '评论内容不能为空'
      }
    }

    if (content.length > 500) {
      return {
        success: false,
        error: '评论内容不能超过500字'
      }
    }

    const db = cloud.database()
    const _ = db.command
    
    // 1. 验证菜品是否存在
    const dishResult = await db.collection('dishes')
      .doc(dishId)
      .get()

    if (!dishResult.data) {
      return {
        success: false,
        error: '菜品不存在'
      }
    }

    // 2. 获取用户信息（这里简化处理，实际应该从用户表中获取）
    const userInfo = {
      userId: wxContext.OPENID,
      userName: '微信用户', // 默认名称，实际应该获取用户昵称
      userAvatar: 'cloud://.../default-avatar.png' // 默认头像
    }

    // 3. 创建评论记录
    const now = new Date()
    const commentData = {
      dishId: dishId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      userAvatar: userInfo.userAvatar,
      rating: parseFloat(rating),
      content: content.trim(),
      images: images,
      createTime: now,
      updateTime: now,
      likeCount: 0,
      replyCount: 0
    }

    // 4. 在事务中同时保存评论和更新菜品评分
    const result = await db.collection('comments')
      .add({
        data: commentData
      })

    if (!result._id) {
      throw new Error('添加评论失败')
    }

    // 5. 更新菜品评分（异步进行，不阻塞返回）
    try {
      await this.updateDishRating(dishId, db)
    } catch (updateError) {
      console.error('更新菜品评分失败:', updateError)
      // 不影响评论提交成功
    }

    return {
      success: true,
      commentId: result._id,
      message: '评论成功'
    }

  } catch (error) {
    console.error('添加评论失败:', error)
    return {
      success: false,
      error: error.message || '评论失败，请稍后重试'
    }
  }
}

// 更新菜品评分
async function updateDishRating(dishId, db) {
  // 获取所有评论的评分
  const commentsResult = await db.collection('comments')
    .where({
      dishId: dishId
    })
    .field({
      rating: true
    })
    .get()

  if (commentsResult.data && commentsResult.data.length > 0) {
    const ratings = commentsResult.data.map(comment => comment.rating)
    const averageRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    
    // 更新菜品评分和评论数
    await db.collection('dishes')
      .doc(dishId)
      .update({
        data: {
          rating: parseFloat(averageRating),
          ratingCount: ratings.length,
          updateTime: new Date()
        }
      })
  }
}