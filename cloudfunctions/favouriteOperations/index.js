// cloudfunctions/favouriteOperations/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { operation, dishId, userId } = event
    
    if (!userId) {
      return {
        success: false,
        error: '用户ID不能为空'
      }
    }
    
    const db = cloud.database()
    const _ = db.command
    
    switch (operation) {
      case 'checkFavourite':
        // 检查用户是否已收藏
        const checkResult = await db.collection('favourite')
          .where({
            dishId: dishId,
            userId: userId
          })
          .get()
        
        return {
          success: true,
          isFavourite: checkResult.data.length > 0,
          data: checkResult.data[0]
        }
        
      case 'addFavourite':
        // 添加收藏
        const favouriteData = {
          dishId: dishId,
          userId: userId,
          createTime: new Date(),
          updateTime: new Date()
        }
        
        const addResult = await db.collection('favourite').add({
          data: favouriteData
        })
        
        // 更新菜品的收藏数
        await db.collection('dishes').doc(dishId).update({
          data: {
            favourCount: _.inc(1)
          }
        })
        
        return {
          success: true,
          favouriteId: addResult._id
        }
        
      case 'removeFavourite':
        // 删除收藏
        await db.collection('favourite')
          .where({
            dishId: dishId,
            userId: userId
          })
          .remove()
        
        // 更新菜品的收藏数
        await db.collection('dishes').doc(dishId).update({
          data: {
            favourCount: _.inc(-1)
          }
        })
        
        return {
          success: true
        }
        
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
    
  } catch (error) {
    console.error('云函数错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}