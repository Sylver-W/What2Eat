// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取微信上下文，包括用户的 openid
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = new Date()
  
  console.log('=== saveuserinfo 开始执行 ===')
  console.log('用户 openid:', openid)
  console.log('接收到的数据:', event)
  
  try {
    // 1. 先查询用户是否已存在
    console.log('正在查询用户是否存在...')
    const userRes = await db.collection('user')
      .where({
        userId: openid
      })
      .get()
    
    console.log('查询结果:', userRes.data)
    console.log('找到用户数量:', userRes.data.length)
    
    // 准备用户数据
    const userData = {
      nickname: event.nickname || '',
      avatarUrl: event.avatarUrl || '',
      gender: event.gender || 0,
      city: event.city || '',
      province: event.province || '',
      lastLoginTime: now
    }
    
    let resultUser = null
    
    if (userRes.data.length > 0) {
      // 2. 用户已存在：更新信息
      console.log('用户已存在，开始更新...')
      const userId = userRes.data[0]._id
      
      await db.collection('user')
        .doc(userId)
        .update({
          data: userData
        })
      
      // 获取更新后的用户信息
      const updatedRes = await db.collection('user')
        .doc(userId)
        .get()
      
      resultUser = updatedRes.data
      console.log('更新成功:', resultUser)
      
    } else {
      // 3. 用户不存在：创建新用户
      console.log('用户不存在，创建新用户...')
      
      const newUser = {
        userId: openid,
        ...userData,
        favouriteCount: 0,
        commentCount: 0,
        createTime: now,
        phone: '',
        tastePreferences: '',
        dormArea: ''
      }
      
      // 添加到user集合
      const addRes = await db.collection('user').add({
        data: newUser
      })
      
      // 获取创建的用户信息
      const createdRes = await db.collection('user')
        .doc(addRes._id)
        .get()
      
      resultUser = createdRes.data
      console.log('创建成功:', resultUser)
    }
    
    // 4. 返回成功响应
    return {
      success: true,
      message: '保存成功',
      data: resultUser
    }
    
  } catch (err) {
    console.error('=== saveuserinfo 执行失败 ===')
    console.error('错误信息:', err)
    console.error('错误堆栈:', err.stack)
    
    return {
      success: false,
      message: '保存用户信息失败',
      error: err.message,
      errorCode: err.errCode || 'UNKNOWN_ERROR'
    }
  }
}