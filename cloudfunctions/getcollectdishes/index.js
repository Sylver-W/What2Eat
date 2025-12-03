const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { pageIndex = 0, pageSize = 10 } = event
  
  console.log('获取收藏菜品，用户:', wxContext.OPENID, '页码:', pageIndex)
  
  try {
    // 1. 获取用户收藏的菜品ID列表
    const favoriteRes = await db.collection('favourite')
      .where({
        userId: wxContext.OPENID
      })
      .orderBy('createTime', 'desc')
      .skip(pageIndex * pageSize)
      .limit(pageSize)
      .get()
    
    console.log('找到收藏记录:', favoriteRes.data.length)
    
    if (favoriteRes.data.length === 0) {
      return {
        code: 0,
        msg: '暂无收藏',
        data: {
          list: [],
          totalCount: 0,
          hasMore: false
        }
      }
    }
    
    // 2. 提取菜品ID数组
    const dishIds = favoriteRes.data.map(item => item.dishId)
    
    // 3. 获取菜品详细信息
    const dishesRes = await db.collection('dishes')
      .where({
        dishId: _.in(dishIds),
        isAvailable: true  // 只获取已上架的菜品
      })
      .get()
    
    // 4. 按收藏时间排序（保持与收藏记录相同的顺序）
    const dishMap = {}
    dishesRes.data.forEach(dish => {
      dishMap[dish.dishId] = dish
    })
    
    const sortedDishes = []
    dishIds.forEach(dishId => {
      if (dishMap[dishId]) {
        sortedDishes.push(dishMap[dishId])
      }
    })
    
    // 5. 获取总收藏数
    const countRes = await db.collection('favourite')
      .where({
        userId: wxContext.OPENID
      })
      .count()
    
    const totalCount = countRes.total
    const hasMore = (pageIndex + 1) * pageSize < totalCount
    
    console.log('返回菜品数:', sortedDishes.length, '总计:', totalCount, '还有更多:', hasMore)
    
    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: sortedDishes,
        totalCount,
        hasMore
      }
    }
    
  } catch (error) {
    console.error('获取收藏菜品失败:', error)
    return {
      code: -1,
      msg: '获取收藏失败，请稍后重试',
      data: {
        list: [],
        totalCount: 0,
        hasMore: false
      }
    }
  }
}