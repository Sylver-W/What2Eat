const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { pageIndex = 0, pageSize = 10 } = event
  
  console.log('获取我的评价，用户:', wxContext.OPENID, '页码:', pageIndex)
  
  try {
    // 1. 获取用户的评价列表
    const commentRes = await db.collection('comment')
      .where({
        userId: wxContext.OPENID
      })
      .orderBy('createTime', 'desc')
      .skip(pageIndex * pageSize)
      .limit(pageSize)
      .get()
    
    console.log('找到评价记录:', commentRes.data.length)
    
    if (commentRes.data.length === 0) {
      return {
        code: 0,
        msg: '暂无评价',
        data: {
          list: [],
          totalCount: 0,
          hasMore: false
        }
      }
    }
    
    // 2. 处理评价数据（添加冗余字段）
    const processedComments = commentRes.data.map(comment => {
      return {
        commentId: comment.commentId,
        dishId: comment.dishId,
        dishName: comment.dishName || '未知菜品',
        canteenId: comment.canteenId,
        canteenName: comment.canteenName || '未知食堂',
        userId: comment.userId,
        userAvatar: comment.userAvatar || '',
        userNickname: comment.userNickname || '匿名用户',
        rating: comment.rating || 0,
        content: comment.content || '',
        images: comment.images || [],
        likeCount: comment.likeCount || 0,
        createTime: comment.createTime,
        updateTime: comment.updateTime
      }
    })
    
    // 3. 获取总评价数
    const countRes = await db.collection('comment')
      .where({
        userId: wxContext.OPENID
      })
      .count()
    
    const totalCount = countRes.total
    const hasMore = (pageIndex + 1) * pageSize < totalCount
    
    console.log('返回评价数:', processedComments.length, '总计:', totalCount, '还有更多:', hasMore)
    
    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: processedComments,
        totalCount,
        hasMore
      }
    }
    
  } catch (error) {
    console.error('获取我的评价失败:', error)
    return {
      code: -1,
      msg: '获取评价失败，请稍后重试',
      data: {
        list: [],
        totalCount: 0,
        hasMore: false
      }
    }
  }
}