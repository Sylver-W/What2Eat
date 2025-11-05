const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { name, canteen, price, tags = [], supplyTime = '', image = '', status = 'pending', uploader } = event;
  if (!name || !canteen || !price || !image) {
    return { success: false, message: '参数不足' };
  }
  const record = {
    name,
    canteen,
    price,
    tags,
    supplyTime,
    image,
    status,
    uploader: uploader || wxContext.OPENID,
    created_at: db.serverDate()
  };
  const res = await db.collection('dishes').add({ data: record });
  return { success: true, id: res._id };
};
