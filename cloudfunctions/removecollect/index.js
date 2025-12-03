const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { dishId } = event
  
  console.log('取消收藏，用户:', wxContext.OPENID, '菜品:', dishId)
  
  try {
    // 1. 验证参数
    if (!dishId) {
      return {
        code: -1,
        msg: '菜品ID不能为空'
      }
    }
    
    // 2. 查找收藏记录
    const favRes = await db.collection('favourite')
      .where({
        userId: wxContext.OPENID,
        dishId: dishId
      })
      .get()
    
    if (favRes.data.length === 0) {
      return {
        code: -1,
        msg: '未找到收藏记录'
      }
    }
    
    // 3. 删除收藏记录
    await db.collection('favourite')
      .where({
        userId: wxContext.OPENID,
        dishId: dishId
      })
      .remove()
    
    // 4. 更新菜品的收藏数（减1）
    await db.collection('dishes')
      .where({
        dishId: dishId
      })
      .update({
        data: {
          favourCount: _.inc(-1)
        }
      })
    
    // 5. 【重要修改】更新用户的收藏计数 - 集合名改为 user
    await db.collection('user')  // 这里从 users 改为 user
      .where({
        _openid: wxContext.OPENID
      })
      .update({
        data: {
          favouriteCount: _.inc(-1)
        }
      })
    
    console.log('取消收藏成功')
    
    return {
      code: 0,
      msg: '取消收藏成功'
    }
    
  } catch (error) {
    console.error('取消收藏失败:', error)
    return {
      code: -1,
      msg: '取消收藏失败，请稍后重试'
    }
  }
}