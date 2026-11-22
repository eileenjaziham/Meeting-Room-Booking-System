'use strict';
const { openDatabase } = require('./db');
const { seed } = require('./seed');
const { createService } = require('./service');
const { createHttpServer } = require('./http');
async function main() {
  const host = process.env.HOST || '127.0.0.1';
  const devLogin = process.env.ENABLE_DEV_LOGIN !== 'false';
  if (devLogin && !['127.0.0.1','localhost','::1'].includes(host)) throw new Error('测试账号登录仅允许绑定回环地址');
  const db = await openDatabase();
  await seed(db, { demo: devLogin });
  const server = createHttpServer(createService(db), { devLogin, driver: db.driver });
  server.listen(Number(process.env.PORT || 3000), host, () => console.log('本地课程开发服务 http://' + host + ':' + server.address().port + ' | 数据库=' + db.driver + ' | 虚构测试账号=' + devLogin));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
