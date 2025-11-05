const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { openid } = event;
  const wxContext = cloud.getWXContext();
  const targetOpenid = openid || wxContext.OPENID;
  if (!targetOpenid) {
    return { exists: false };
  }
  const userRes = await db.collection('users').where({ openid: targetOpenid }).get();
  if (!userRes.data.length) {
    return { exists: false };
  }
  const user = userRes.data[0];
  return {
    exists: true,
    user
  };
};
