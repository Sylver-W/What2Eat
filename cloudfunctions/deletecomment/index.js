const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { commentId, dishId } = event
  
  console.log('删除评价，用户:', wxContext.OPENID, '评价ID:', commentId, '菜品ID:', dishId)
  
  try {
    // 1. 验证参数
    if (!commentId) {
      return {
        code: -1,
        msg: '评价ID不能为空'
      }
    }
    
    if (!dishId) {
      return {
        code: -1,
        msg: '菜品ID不能为空'
      }
    }
    
    // 2. 查找评价记录
    const commentRes = await db.collection('comment')
      .where({
        commentId: commentId,
        userId: wxContext.OPENID
      })
      .get()
    
    if (commentRes.data.length === 0) {
      return {
        code: -1,
        msg: '未找到评价记录或无权删除'
      }
    }
    
    const comment = commentRes.data[0]
    const rating = comment.rating || 0
    
    // 3. 删除评价记录
    await db.collection('comment')
      .where({
        commentId: commentId,
        userId: wxContext.OPENID
      })
      .remove()
    
    // 4. 删除相关点赞记录
    await db.collection('like')
      .where({
        commentId: commentId.toString()
      })
      .remove()
    
    // 5. 更新菜品的评分（重新计算平均分）
    const dishCommentsRes = await db.collection('comment')
      .where({
        dishId: dishId
      })
      .get()
    
    if (dishCommentsRes.data.length > 0) {
      const totalRating = dishCommentsRes.data.reduce((sum, c) => sum + (c.rating || 0), 0)
      const averageRating = totalRating / dishCommentsRes.data.length
      const ratingCount = dishCommentsRes.data.length
      
      await db.collection('dishes')
        .where({
          dishId: dishId
        })
        .update({
          data: {
            rating: averageRating.toFixed(1),
            ratingCount: ratingCount
          }
        })
      
      console.log(`更新菜品评分: dishId=${dishId}, 新评分=${averageRating.toFixed(1)}, 评价数=${ratingCount}`)
    } else {
      // 如果没有其他评价，重置评分
      await db.collection('dishes')
        .where({
          dishId: dishId
        })
        .update({
          data: {
            rating: 0,
            ratingCount: 0
          }
        })
    }
    
    // 6. 更新用户的评价计数（使用 user 集合）
    await db.collection('user')
      .where({
        _openid: wxContext.OPENID
      })
      .update({
        data: {
          commentCount: _.inc(-1)
        }
      })
    
    console.log('删除评价成功')
    
    return {
      code: 0,
      msg: '删除评价成功'
    }
    
  } catch (error) {
    console.error('删除评价失败:', error)
    
    // 提供更友好的错误信息
    let userMsg = '删除失败，请稍后重试'
    if (error.errCode === -502002) {
      userMsg = '数据库权限不足，请检查权限设置'
    }
    
    return {
      code: -1,
      msg: userMsg
    }
  }
}