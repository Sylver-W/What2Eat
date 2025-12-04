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
    
    // 2. 查找收藏记录 - dishId可能是数字或字符串
    let dishIdForQuery = dishId;
    
    // 如果dishId是数字（如1001），需要转成字符串"dish001"格式
    if (typeof dishId === 'number' || /^\d+$/.test(dishId)) {
      const dishNum = parseInt(dishId);
      if (!isNaN(dishNum)) {
        dishIdForQuery = 'dish' + dishNum;
      }
    }
    
    console.log('查询收藏记录，dishId:', dishIdForQuery);
    
    const favRes = await db.collection('favourite')
      .where({
        userId: wxContext.OPENID,
        dishId: dishIdForQuery
      })
      .get()
    
    if (favRes.data.length === 0) {
      // 尝试用数字格式查询
      if (typeof dishIdForQuery === 'string' && dishIdForQuery.startsWith('dish')) {
        const dishNum = parseInt(dishIdForQuery.replace('dish', ''));
        if (!isNaN(dishNum)) {
          const favRes2 = await db.collection('favourite')
            .where({
              userId: wxContext.OPENID,
              dishId: dishNum.toString() // 尝试数字字符串
            })
            .get()
          
          if (favRes2.data.length > 0) {
            return {
              code: -1,
              msg: '未找到收藏记录（ID格式不匹配）'
            }
          }
        }
      }
      
      return {
        code: -1,
        msg: '未找到收藏记录'
      }
    }
    
    // 3. 删除收藏记录
    await db.collection('favourite')
      .where({
        userId: wxContext.OPENID,
        dishId: dishIdForQuery
      })
      .remove()
    
    // 4. 更新菜品的收藏数（减1） - 需要数字dishId
    let dishNumForUpdate;
    if (typeof dishId === 'number') {
      dishNumForUpdate = dishId;
    } else if (typeof dishId === 'string') {
      if (dishId.startsWith('dish')) {
        dishNumForUpdate = parseInt(dishId.replace('dish', ''));
      } else {
        dishNumForUpdate = parseInt(dishId);
      }
    }
    
    if (!isNaN(dishNumForUpdate)) {
      await db.collection('dishes')
        .where({
          dishId: dishNumForUpdate
        })
        .update({
          data: {
            favourCount: _.inc(-1)
          }
        })
    }
    
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