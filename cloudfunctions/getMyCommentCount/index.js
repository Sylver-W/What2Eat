// cloudfunctions/getMyCommentCount/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('=== getMyCommentCount 云函数被调用 ===')
  console.log('event:', event)
  console.log('context:', context)
  
  try {
    const wxContext = cloud.getWXContext()
    const db = cloud.database()
    
    console.log('wxContext:', {
      OPENID: wxContext.OPENID,
      APPID: wxContext.APPID,
      UNIONID: wxContext.UNIONID
    })
    
    // 使用传入的openid或当前用户的openid
    const openid = event.openid || wxContext.OPENID
    
    if (!openid) {
      console.log('无openid，返回错误')
      return {
        code: -1,
        msg: '用户未登录',
        data: null
      }
    }
    
    console.log('查询评论数，用户openid:', openid)
    
    let countResult
    let queryField = ''
    let total = 0
    
    try {
      // 先尝试 _openid 字段
      console.log('尝试使用 _openid 字段查询')
      countResult = await db.collection('comments')
        .where({
          _openid: openid
        })
        .count()
      queryField = '_openid'
      total = countResult.total || 0
      console.log('使用 _openid 查询成功，数量:', total)
    } catch (error) {
      console.log('使用 _openid 查询失败:', error.message)
      
      try {
        // 再尝试 userId 字段
        console.log('尝试使用 userId 字段查询')
        countResult = await db.collection('comments')
          .where({
            userId: openid
          })
          .count()
        queryField = 'userId'
        total = countResult.total || 0
        console.log('使用 userId 查询成功，数量:', total)
      } catch (error2) {
        console.log('使用 userId 查询失败:', error2.message)
        
        try {
          // 最后尝试 userid 字段（小写）
          console.log('尝试使用 userid 字段查询')
          countResult = await db.collection('comments')
            .where({
              userid: openid
            })
            .count()
          queryField = 'userid'
          total = countResult.total || 0
          console.log('使用 userid 查询成功，数量:', total)
        } catch (error3) {
          console.log('所有查询方式都失败:', error3.message)
          // 可能是集合不存在或其他错误
          queryField = 'all_failed'
          total = 0
        }
      }
    }
    
    console.log(`最终结果: 使用 ${queryField} 字段，评论数: ${total}`)
    
    return {
      code: 0,
      msg: '获取成功',
      data: {
        count: total,
        queryField: queryField
      }
    }
    
  } catch (error) {
    console.error('云函数执行异常:', error)
    
    return {
      code: -1,
      msg: '服务器异常: ' + error.message,
      data: null
    }
  }
}