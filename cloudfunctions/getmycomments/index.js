// 云函数 getmycomments/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command
  
  try {
    const { pageIndex = 0, pageSize = 10 } = event
    
    // 获取当前用户的 openid
    const userOpenId = wxContext.OPENID
    console.log('当前用户OpenID:', userOpenId)
    
    if (!userOpenId) {
      return {
        code: -1,
        msg: '用户未登录',
        data: null
      }
    }
    
    // 计算 skip 数量
    const skip = pageIndex * pageSize
    
    console.log('开始查询用户的评论...')
    
    // **关键修改：根据你的数据结构，我们查询 _openid 字段**
    // 因为你的评论记录中，_openid 字段存储的是真实的 openid
    // 而 userId 字段存储的是临时生成的 user_xxx
    const countResult = await db.collection('comments')
      .where({
        _openid: userOpenId  // 使用 _openid 字段查询
      })
      .count()
    
    const totalCount = countResult.total
    console.log('查询到评论总数:', totalCount)
    
    // 查询评论列表
    const queryResult = await db.collection('comments')
      .where({
        _openid: userOpenId  // 使用 _openid 字段查询
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    const comments = queryResult.data || []
    console.log('本次查询到评论数量:', comments.length)
    
    if (comments.length > 0) {
      console.log('第一条评论内容:', comments[0].content)
      console.log('评论的用户ID字段:', {
        userId: comments[0].userId,
        _openid: comments[0]._openid
      })
    }
    
    // 返回数据
    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: comments,
        totalCount: totalCount,
        hasMore: skip + pageSize < totalCount,
        pageIndex: pageIndex,
        pageSize: pageSize
      }
    }
    
  } catch (error) {
    console.error('获取我的评论失败:', error)
    return {
      code: -1,
      msg: '获取失败：' + error.message,
      data: null
    }
  }
}