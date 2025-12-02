// 云函数 getcanteenlist/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 1. 获取食堂数据
    const res = await db.collection("canteens")
      .orderBy("canteenId", "asc")
      .get()

    const canteens = res.data
    
    // 2. 提取所有 cloud:// 图片路径
    const cloudFileList = canteens
      .map(item => item.image)
      .filter(img => img && img.startsWith('cloud://'))
    
    let tempFileMap = {}
    
    // 3. 如果有云存储图片，获取临时链接
    if (cloudFileList.length > 0) {
      try {
        const tempRes = await cloud.getTempFileURL({
          fileList: cloudFileList
        })
        
        // 创建 fileID -> tempFileURL 的映射
        tempRes.fileList.forEach(item => {
          tempFileMap[item.fileID] = item.tempFileURL
        })
      } catch (fileErr) {
        console.error('获取临时链接失败:', fileErr)
      }
    }
    
    // 4. 处理食堂数据，替换图片路径
    const processedCanteens = canteens.map(canteen => {
      const processed = { ...canteen }
      
      // 替换图片路径为临时链接
      if (canteen.image && canteen.image.startsWith('cloud://')) {
        processed.image = tempFileMap[canteen.image] || canteen.image
      }
      
      // 确保特色菜品是数组格式
      if (!Array.isArray(processed.featuredDishes)) {
        processed.featuredDishes = processed.featuredDishes ? 
          [processed.featuredDishes] : []
      }
      
      return processed
    })
    
    // 5. 返回处理后的数据
    return {
      code: 0,
      data: processedCanteens
    }

  } catch (err) {
    console.error(err)
    return {
      code: -1,
      msg: "获取食堂列表失败"
    }
  }
}