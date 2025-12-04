// 云函数：updateuserinfo
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID: openid } = cloud.getWXContext()

  console.log("更新用户信息 - openid:", openid)
  console.log("收到的字段:", event)

  try {
    // -------- 1. 筛选可更新的字段 --------
    const allowedFields = [
      "nickname",
      "avatarUrl",
      "gender",
      "phone",
      "dormArea",
      "tastePreferences"
    ]

    const updateData = {}

    allowedFields.forEach(key => {
      if (event.hasOwnProperty(key)) {
        updateData[key] = event[key]   // 支持 null / 空值更新
      }
    })

    updateData.updatedAt = new Date()  // 添加更新时间戳

    console.log("准备更新的数据:", updateData)

    // -------- 2. 执行更新（用户一定存在） --------
    const updateRes = await db.collection("user")
      .doc(openid)
      .update({
        data: updateData
      })

    console.log("更新结果:", updateRes)

    // -------- 3. 返回用户更新后的最新信息 --------
    const newUser = await db.collection("user")
      .doc(openid)
      .get()

    return {
      success: true,
      message: "用户信息更新成功",
      data: newUser.data
    }

  } catch (err) {
    console.error("更新失败:", err)
    return {
      success: false,
      message: "更新失败",
      error: err.message
    }
  }
}
