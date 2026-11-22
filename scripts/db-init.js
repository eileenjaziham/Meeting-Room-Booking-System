const { openDatabase } = require('../server/db');
const { seed } = require('../server/seed');
(async () => { const db = await openDatabase(); try { await seed(db, { demo: process.env.ENABLE_DEV_LOGIN === 'true' }); console.log('初始化完成：' + db.driver + '，测试用户=' + (process.env.ENABLE_DEV_LOGIN === 'true')); } finally { await db.close(); } })().catch(e => { console.error(e); process.exitCode=1; });
