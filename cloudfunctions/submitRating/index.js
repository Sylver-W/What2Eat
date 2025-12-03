// cloudfunctions/submitRating/index.js
const cloud = require('wx-server-sdk')
cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV 
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { canteenId, rating } = event
  
  console.log('收到评分请求:', {
    canteenId: canteenId,
    rating: rating,
    openid: wxContext.OPENID,
    appid: wxContext.APPID
  })
  
  // 验证参数
  if (!canteenId || rating === undefined) {
    return {
      code: -1,
      msg: "参数错误：缺少canteenId或rating"
    }
  }
  
  if (rating < 0 || rating > 5) {
    return {
      code: -1,
      msg: "评分必须在0-5之间"
    }
  }
  
  try {
    // 1. 检查食堂是否存在
    const canteenRes = await db.collection("canteens")
      .where({ canteenId: canteenId })
      .get()
    
    if (canteenRes.data.length === 0) {
      return {
        code: -1,
        msg: "食堂不存在"
      }
    }
    
    const canteen = canteenRes.data[0]
    
    // 2. 检查是否已评分过
    const existingRating = await db.collection("ratings")
      .where({
        canteenId: canteenId,
        _openid: wxContext.OPENID
      })
      .get()
    
    const now = new Date()
    let ratingId = null
    
    // 3. 保存评分记录
    if (existingRating.data.length > 0) {
      // 更新现有评分
      ratingId = existingRating.data[0]._id
      await db.collection("ratings").doc(ratingId).update({
        data: {
          rating: rating,
          updateTime: now
        }
      })
      console.log('更新现有评分记录:', ratingId)
    } else {
      // 新增评分记录
      const addRes = await db.collection("ratings").add({
        data: {
          canteenId: canteenId,
          rating: rating,
          _openid: wxContext.OPENID,
          createTime: now,
          updateTime: now
        }
      })
      ratingId = addRes._id
      console.log('创建新评分记录:', ratingId)
    }
    
    // 4. 重新计算该食堂的平均分
    const allRatings = await db.collection("ratings")
      .where({ canteenId: canteenId })
      .get()
    
    console.log(`食堂 ${canteenId} 共有 ${allRatings.data.length} 条评分`)
    
    let newAverageRating = rating
    if (allRatings.data.length > 0) {
      const total = allRatings.data.reduce((sum, item) => sum + item.rating, 0)
      newAverageRating = Number((total / allRatings.data.length).toFixed(1))
    }
    
    // 5. 更新食堂表的评分信息
    await db.collection("canteens").where({ canteenId: canteenId }).update({
      data: {
        rating: newAverageRating,
        ratingCount: allRatings.data.length,
        updateTime: now
      }
    })
    
    console.log('更新食堂评分成功:', {
      canteenId: canteenId,
      oldRating: canteen.rating,
      newRating: newAverageRating,
      ratingCount: allRatings.data.length
    })
    
    return {
      code: 0,
      msg: existingRating.data.length > 0 ? "评分已更新" : "评分成功",
      data: {
        canteenId: canteenId,
        newAverageRating: newAverageRating,
        ratingCount: allRatings.data.length,
        hasRatedBefore: existingRating.data.length > 0,
        userRating: rating
      }
    }
    
  } catch (err) {
    console.error('评分处理失败:', err)
    return {
      code: -1,
      msg: "服务器错误：" + err.message
    }
  }
}