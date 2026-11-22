'use strict';
const cloud = require('wx-server-sdk');
const { createHash } = require('node:crypto');
const { openDatabase } = require('./server/db');
const { createService, BusinessError } = require('./server/service');
const { seed } = require('./server/seed');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
let ready;
async function init() {
  if (process.env.ENABLE_DEV_LOGIN === 'true') throw new Error('云环境禁止测试账号登录');
  if (!process.env.DATABASE_URL) throw new Error('请配置服务端 PostgreSQL 连接字符串');
  const db = await openDatabase({ driver: 'pg', initialize: false });
  await seed(db);
  return { db, service: createService(db) };
}
exports.main = async event => {
  try {
    // 只接受微信调用链给出的 OPENID，绝不信任 event 中的角色、用户ID或管理员字段。
    const { OPENID, APPID } = cloud.getWXContext();
    if (!OPENID || !APPID) throw new BusinessError('UNAUTHENTICATED', '必须从已关联的小程序调用', 401);
    if (!event || typeof event.action !== 'string') throw new BusinessError('VALIDATION', '缺少操作名');
    if (!ready) ready = init().catch(error => { ready = null; throw error; });
    const { db, service } = await ready;
    const userId = 'wx-' + createHash('sha256').update(APPID + ':' + OPENID).digest('hex');
    await db.transact(state => {
      if (!state.users.some(x=>x.id===userId)) state.users.push({id:userId,name:'',studentNo:'',phone:'',identityType:null,verification:'unsubmitted'});
    });
    return { ok: true, data: await service.execute(userId, event.action, event.payload || {}) };
  } catch (error) {
    if (!(error instanceof BusinessError)) console.error('Cloud API error', error.code || error.name);
    return { ok: false, error: { code: error instanceof BusinessError ? error.code : 'INTERNAL', message: error instanceof BusinessError ? error.message : '云服务未就绪，请检查数据库配置与日志' } };
  }
};
