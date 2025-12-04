const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { pageIndex = 0, pageSize = 10, type } = event
  
  console.log('=== getmycomments 云函数开始 ===')
  console.log('参数:', event)
  console.log('当前用户OPENID:', wxContext.OPENID)
  
  // 获取用户信息，找到对应的 userId
  try {
    // 先从用户表获取用户的 userId
    const userRes = await db.collection('user')
      .where({
        _openid: wxContext.OPENID
      })
      .get()
    
    console.log('用户查询结果:', userRes)
    
    let targetUserId = wxContext.OPENID  // 默认使用 OPENID
    
    if (userRes.data.length > 0) {
      const user = userRes.data[0]
      // 检查用户表中的 userid 字段
      if (user.userid) {
        targetUserId = user.userid
      }
      console.log('从用户表获取的 userid:', targetUserId)
    }
    
    // 添加获取数量的类型
    if (type === 'getCount') {
      try {
        console.log('开始获取评价数量...')
        
        // 方法1：先用 userId 查询（自定义ID）
        const countRes1 = await db.collection('comments')
          .where({
            userId: targetUserId
          })
          .count()
        
        console.log('使用userId查询结果:', countRes1)
        
        // 如果没找到，方法2：用 _openid 查询
        if (countRes1.total === 0) {
          console.log('尝试使用_openid查询...')
          const countRes2 = await db.collection('comments')
            .where({
              _openid: wxContext.OPENID
            })
            .count()
          
          console.log('使用_openid查询结果:', countRes2)
          
          return {
            code: 0,
            msg: '获取成功',
            data: {
              count: countRes2.total,
              queryField: '_openid'
            }
          }
        }
        
        return {
          code: 0,
          msg: '获取成功',
          data: {
            count: countRes1.total,
            queryField: 'userId'
          }
        }
        
      } catch (error) {
        console.error('获取评价数量失败:', error)
        return {
          code: -1,
          msg: '获取数量失败：' + error.message,
          data: {
            count: 0
          }
        }
      }
    }
    
    // 获取评论列表
    console.log('获取我的评价列表，页码:', pageIndex)
    
    // 先尝试用 userId 查询
    let commentRes
    try {
      commentRes = await db.collection('comments')
        .where({
          userId: targetUserId
        })
        .orderBy('createTime', 'desc')
        .skip(pageIndex * pageSize)
        .limit(pageSize)
        .get()
      
      console.log('使用userId查询到评论数:', commentRes.data.length)
      
      // 如果没找到，尝试用 _openid
      if (commentRes.data.length === 0) {
        commentRes = await db.collection('comments')
          .where({
            _openid: wxContext.OPENID
          })
          .orderBy('createTime', 'desc')
          .skip(pageIndex * pageSize)
          .limit(pageSize)
          .get()
        
        console.log('使用_openid查询到评论数:', commentRes.data.length)
      }
      
    } catch (queryError) {
      console.error('查询出错，尝试_openid:', queryError)
      commentRes = await db.collection('comments')
        .where({
          _openid: wxContext.OPENID
        })
        .orderBy('createTime', 'desc')
        .skip(pageIndex * pageSize)
        .limit(pageSize)
        .get()
    }
    
    console.log('最终找到评价记录:', commentRes.data.length)
    
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
    
    // 处理评价数据
    const processedComments = commentRes.data.map(comment => {
      return {
        commentId: comment._id,
        dishId: comment.dishId,
        dishName: comment.dishName,
        canteenId: comment.canteenId,
        canteenName: comment.canteenName,
        userId: comment.userId || comment._openid,
        userAvatar: comment.userAvatar,
        userNickname: comment.userNickname,
        rating: comment.rating,
        content: comment.content,
        images: comment.images,
        likeCount: comment.likeCount,
        createTime: comment.createTime,
        updateTime: comment.updateTime
      }
    })
    
    // 获取总评价数
    let totalCount = 0
    try {
      const countRes = await db.collection('comments')
        .where({
          userId: targetUserId
        })
        .count()
      totalCount = countRes.total
    } catch (e) {
      const countRes = await db.collection('comments')
        .where({
          _openid: wxContext.OPENID
        })
        .count()
      totalCount = countRes.total
    }
    
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