// updateuserinfo/index.js - 支持所有字段更新
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  console.log('🚀 UPDATEUSERINFO 完整版 - 支持所有字段')
  
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  console.log('用户openid:', openid)
  console.log('接收的完整数据:', event)
  
  try {
    // 1. 查询用户是否存在
    const userRes = await db.collection('user')
      .where({ userId: openid })
      .get()
    
    console.log('查询结果：找到', userRes.data.length, '个用户')
    
    // 2. 构建更新数据（支持所有字段）
    const updateData = {}
    
    // 基础信息
    if (event.nickname !== undefined) updateData.nickname = event.nickname
    if (event.avatarUrl !== undefined) updateData.avatarUrl = event.avatarUrl
    if (event.gender !== undefined) updateData.gender = event.gender
    if (event.city !== undefined) updateData.city = event.city
    if (event.province !== undefined) updateData.province = event.province
    
    // 个人资料新增字段
    if (event.phone !== undefined) updateData.phone = event.phone
    if (event.dormArea !== undefined) updateData.dormArea = event.dormArea
    if (event.tastePreferences !== undefined) updateData.tastePreferences = event.tastePreferences
    
    console.log('要更新的数据:', updateData)
    
    let resultUser = null
    
    if (userRes.data.length > 0) {
      // 3. 用户存在：更新信息
      console.log('更新现有用户，用户ID:', userRes.data[0]._id)
      const userId = userRes.data[0]._id
      
      await db.collection('user')
        .doc(userId)
        .update({
          data: updateData
        })
      
      // 获取更新后的数据
      const updatedRes = await db.collection('user')
        .doc(userId)
        .get()
      
      resultUser = updatedRes.data
      console.log('更新成功:', resultUser)
      
    } else {
      // 4. 用户不存在：创建新用户（包含所有字段）
      console.log('创建新用户（带完整信息）')
      
      const newUser = {
        userId: openid,
        nickname: event.nickname || '',
        avatarUrl: event.avatarUrl || '',
        gender: event.gender || 0,
        city: event.city || '',
        province: event.province || '',
        phone: event.phone || '',
        dormArea: event.dormArea || '',
        tastePreferences: event.tastePreferences || '',
        favouriteCount: 0,
        commentCount: 0,
        createTime: db.serverDate()
      }
      
      const addRes = await db.collection('user').add({
        data: newUser
      })
      
      console.log('创建成功，文档ID:', addRes._id)
      
      const createdRes = await db.collection('user')
        .doc(addRes._id)
        .get()
      
      resultUser = createdRes.data
      console.log('用户数据:', resultUser)
    }
    
    // 5. 返回成功响应
    return {
      success: true,
      message: '用户信息更新成功',
      data: resultUser
    }
    
  } catch (error) {
    console.error('❌ 云函数执行错误:', error)
    return {
      success: false,
      message: '更新失败: ' + error.message,
      error: error.message
    }
  }
}