// getuserinfo/index.js - 确保返回所有字段

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  console.log('getuserinfo: 查询用户', openid)
  
  try {
    const userRes = await db.collection('user')
      .where({ _id: openid })
      .get()
    if (userRes.data.length > 0) {
      // 确保所有字段都有默认值
      const userData = {
        // 基础字段
        _id: userRes.data[0]._id,
        userId: userRes.data[0].userId,
        nickname: userRes.data[0].nickname || '',
        avatarUrl: userRes.data[0].avatarUrl || '',
        gender: userRes.data[0].gender || 0,
        // 个人资料字段
        phone: userRes.data[0].phone || '',
        dormArea: userRes.data[0].dormArea || '',
        tastePreferences: userRes.data[0].tastePreferences || '',
        // 时间字段
        createTime: userRes.data[0].createTime
      }
      
      return {
        success: true,
        message: '获取用户信息成功',
        data: userData
      }
    } else {
      return {
        success: false,
        message: '用户未注册',
        data: null
      }
    }
    
  } catch (err) {
    console.error('查询用户失败:', err)
    return {
      success: false,
      message: '查询失败',
      error: err.message
    }
  }
}