const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event, context) => {
  const { openid, nickname, avatar, role = 'user', phone = '' } = event;
  if (!openid) {
    return { success: false, message: '缺少 openid' };
  }
  const exist = await users.where({ openid }).get();
  if (exist.data.length > 0) {
    return { success: true, message: '已存在', user: exist.data[0] };
  }
  const record = {
    openid,
    nickname,
    avatar,
    role,
    phone,
    favorites: [],
    created_at: db.serverDate()
  };
  const addRes = await users.add({ data: record });
  return {
    success: true,
    id: addRes._id,
    user: { ...record, _id: addRes._id }
  };
};
