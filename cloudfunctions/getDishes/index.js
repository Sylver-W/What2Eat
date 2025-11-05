const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { keyword = '' } = event;
  const _ = db.command;
  const conditions = [{ status: 'approved' }];
  if (keyword) {
    conditions.push({
      name: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    });
  }
  const where = keyword
    ? _.and([{ status: 'approved' }, _.or([
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { canteen: db.RegExp({ regexp: keyword, options: 'i' }) },
        { tags: keyword }
      ])])
    : { status: 'approved' };
  const res = await db.collection('dishes').where(where).orderBy('created_at', 'desc').limit(50).get();
  return {
    dishes: res.data
  };
};
