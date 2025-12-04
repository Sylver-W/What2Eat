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
    
    console.log('找到收藏记录:', favoriteRes.data)
    
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
    
    // 2. 提取收藏记录中的菜品信息（注意：favourite表中可能有菜品完整信息）
    // 如果favourite表已有菜品信息，直接使用
    const enrichedDishes = favoriteRes.data.map(favItem => {
      // 尝试从favourite表中提取菜品信息
      const dishInfo = {
        // 从favourite表中获取
        dishId: favItem.dishId, // 这个是字符串 "dish001"
        dishName: favItem.dishName || '未知菜品',
        dishPrice: favItem.dishPrice || 0,
        dishRating: favItem.dishRating || 0,
        dishDescription: favItem.dishDescription || '',
        dishImage: favItem.dishImage || '',
        dishTags: favItem.dishTags || [],
        dishLocation: favItem.dishLocation || '',
        canteenName: favItem.canteenName || '',
        // 从dishes表获取（后面会填充）
        _id: null,
        favourCount: 0,
        ratingCount: 0,
        // 收藏信息
        favouriteTime: favItem.createTime,
        favouriteId: favItem._id
      }
      
      return dishInfo;
    })
    
    // 3. 为了获取更多菜品信息（如favourCount, ratingCount），查询dishes表
    // 需要转换dishId格式：字符串"dish001"转数字1001
    const dishIds = favoriteRes.data.map(item => {
      const dishIdStr = item.dishId;
      if (dishIdStr.startsWith('dish')) {
        // 提取数字部分
        const numStr = dishIdStr.replace('dish', '');
        return parseInt(numStr);
      }
      return parseInt(dishIdStr);
    }).filter(id => !isNaN(id));
    
    console.log('转换后的dishIds:', dishIds);
    
    let dishesDetails = [];
    if (dishIds.length > 0) {
      try {
        dishesDetails = await db.collection('dishes')
          .where({
            dishId: _.in(dishIds)
          })
          .get();
        console.log('dishes表查询结果:', dishesDetails.data);
      } catch (error) {
        console.warn('查询dishes表失败:', error);
      }
    }
    
    // 4. 合并数据
    const dishesMap = {};
    dishesDetails.data.forEach(dish => {
      const key = 'dish' + dish.dishId; // 转成字符串格式
      dishesMap[key] = dish;
    });
    
    const finalDishes = enrichedDishes.map(item => {
      const dishKey = item.dishId; // 已经是字符串"dish001"
      const dishDetail = dishesMap[dishKey];
      
      if (dishDetail) {
        // 合并dishes表中的详细信息
        return {
          ...item,
          _id: dishDetail._id,
          dishId: dishDetail.dishId, // 保持字符串格式
          dishName: dishDetail.name || item.dishName,
          dishPrice: dishDetail.price || item.dishPrice,
          dishRating: dishDetail.rating || item.dishRating,
          dishDescription: dishDetail.description || item.dishDescription,
          dishImage: (dishDetail.images && dishDetail.images[0]) || item.dishImage,
          dishTags: dishDetail.tags || item.dishTags,
          dishLocation: dishDetail.canteenName || item.dishLocation,
          canteenName: dishDetail.canteenName || item.canteenName,
          favourCount: dishDetail.favourCount || 0,
          ratingCount: dishDetail.ratingCount || 0,
          price: dishDetail.price || item.dishPrice,
          rating: dishDetail.rating || item.dishRating,
          name: dishDetail.name || item.dishName,
          description: dishDetail.description || item.dishDescription,
          tags: dishDetail.tags || item.dishTags,
          location: dishDetail.canteenName || item.dishLocation
        };
      }
      return item;
    });
    
    // 5. 获取总收藏数
    const countRes = await db.collection('favourite')
      .where({
        userId: wxContext.OPENID
      })
      .count()
    
    const totalCount = countRes.total
    const hasMore = (pageIndex + 1) * pageSize < totalCount
    
    console.log('返回菜品数:', finalDishes.length, '总计:', totalCount, '还有更多:', hasMore)
    
    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: finalDishes,
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