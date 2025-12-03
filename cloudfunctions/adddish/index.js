// cloudfunctions/adddish/index.js
// 版本：提交到独立newdish集合版
const cloud = require('wx-server-sdk')
cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV 
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('=== 提交菜品补充建议到 newdish ===')
  const wxContext = cloud.getWXContext()
  const userOpenId = wxContext.OPENID // 获取提交者唯一ID
  
  try {
    // 1. 接收并验证前端数据
    const { dishName, canteenId, canteenName, price, description, images = [], tags = [] } = event
    
    console.log('收到提交数据:', { dishName, canteenId, price, userOpenId })
    
    // 基本验证
    if (!dishName || dishName.trim().length === 0) {
      return { code: -1, msg: '菜品名不能为空' }
    }
    if (!canteenId) {
      return { code: -1, msg: '请选择食堂' }
    }
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      return { code: -1, msg: '请输入有效的价格（大于0）' }
    }
    if (!description || description.trim().length === 0) {
      return { code: -1, msg: '菜品介绍不能为空' }
    }

    // 2. 生成自增的 suggestionId (作为newdish表的业务主键)
    console.log('开始生成 suggestionId...')
    
    // 获取当前newdish集合的记录总数，用于生成自增ID
    const countRes = await db.collection('newdish').count()
    const nextSuggestionId = countRes.total + 1 // 从1开始自增
    console.log(`当前newdish记录数: ${countRes.total}, 生成suggestionId: ${nextSuggestionId}`)

    // 3. 构建要插入到 newdish 集合的数据对象
    // ★ 完全按照你提供的 newdish 表结构设计 ★
    const suggestionData = {
      // 业务主键
      suggestionId: nextSuggestionId, // 数字类型，自增
      
      // 用户信息
      userId: userOpenId, // 提交用户的OpenID
      
      // 菜品核心信息
      dishName: dishName.trim(),
      canteenId: canteenId,
      canteenName: canteenName || `食堂${canteenId}`, // 冗余字段
      price: priceNum,
      description: description.trim(),
      
      // 图片与标签
      images: Array.isArray(images) ? images : [], // 数组类型
      tags: Array.isArray(tags) ? tags : [],
      
      // 审核相关字段（提交时初始化）
      status: "pending", // 审核状态: pending(待审核), approved(通过), rejected(拒绝)
      createTime: db.serverDate(), // 提交时间（服务端精确时间）
      
      // 以下字段审核时由管理员填充，提交时设为null
      reviewTime: null,
      reviewerId: null,
      reviewComment: null
    }
    
    console.log('准备插入newdish的数据摘要:', {
      suggestionId: suggestionData.suggestionId,
      dishName: suggestionData.dishName,
      status: suggestionData.status
    })

    // 4. 执行数据库插入操作（核心：插入到 newdish，不是 dishes）
    const addResult = await db.collection('newdish').add({
      data: suggestionData
    })
    
    console.log('插入成功！数据库_id:', addResult._id)
    console.log('=== 菜品补充建议提交完成 ===')
    
    // 5. 返回成功信息（注意：这里不会生成 dishId）
    return {
      code: 0,
      msg: `提交成功！您的建议编号为 #${nextSuggestionId}，我们会尽快审核。`,
      data: {
        suggestionId: nextSuggestionId, // 返回的是建议编号
        _id: addResult._id
      }
    }

  } catch (error) {
    // 6. 统一错误处理
    console.error('!!! 提交过程出错 !!!')
    console.error('错误名称:', error.name)
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)
    
    let userMsg = '提交失败，请稍后重试'
    // 针对常见错误给出友好提示
    if (error.errCode === -502002) {
      userMsg = '数据库权限不足，请检查newdish集合权限设置'
    } else if (error.message.includes('collection not exist')) {
      userMsg = '数据表不存在，请确认newdish集合是否创建'
    } else if (error.errCode === 'DATABASE_REQUEST_FAILED') {
      userMsg = '网络请求失败，请检查网络连接'
    }
    
    return {
      code: -1,
      msg: userMsg,
      debug: error.message // 调试信息
    }
  }
}