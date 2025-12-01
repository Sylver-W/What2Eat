const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const res = await db.collection("canteens")
      .orderBy("canteenId", "asc")
      .get()

    return {
      code: 0,
      data: res.data
    }

  } catch (err) {
    console.error(err)
    return {
      code: -1,
      msg: "获取食堂列表失败"
    }
  }
}
