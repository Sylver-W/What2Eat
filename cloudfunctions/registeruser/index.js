const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { avatar, nickname } = event

  // 1. 参数检查
  if (!avatar || !nickname) {
    return {
      success: false,
      error: "缺少头像或昵称"
    }
  }

  try {
    // 2. 写入数据库
    await db.collection("user").doc(openid).set({
      data: {
        avatarUrl:avatar,
        nickname:nickname,
        createTime: new Date(),
        userid:openid
      }
    })

    // 3. 返回统一结构
    return {
      success: true,
      openid
    }
  } catch (e) {
    console.error("registerUser 写入失败：", e)
    return {
      success: false,
      error: e.toString()
    }
  }
}
