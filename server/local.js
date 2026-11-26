'use strict';
const { openDatabase } = require('./db');
const { seed } = require('./seed');
const { createService } = require('./service');
const { createHttpServer } = require('./http');
const { networkOptions } = require('./dev-network');
async function main() {
  const {host,devLogin,lanDemo,allowedClients}=networkOptions();
  const db = await openDatabase();
  await seed(db, { demo: devLogin });
  const server = createHttpServer(createService(db), { devLogin, driver: db.driver,allowedClients });
  server.listen(Number(process.env.PORT || 3000), host, () => console.log((lanDemo?'局域网真机演示':'本地课程开发')+'服务 http://' + host + ':' + server.address().port + ' | 数据库=' + db.driver + ' | 虚构测试账号=' + devLogin));
  server.on('error',async error=>{console.error('后端监听失败：'+error.message);await db.close();process.exitCode=1;});
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
