'use strict';
const { openDatabase } = require('../server/db');
const { seed } = require('../server/seed');

const sourcePath = process.env.PGLITE_SOURCE_PATH || process.env.LOCAL_DB_PATH || './data/local';

(async () => {
  const source = await openDatabase({ driver: 'pglite', path: sourcePath });
  const target = await openDatabase({ driver: 'mysql' });
  try {
    const sourceState = await source.transact(state => JSON.parse(JSON.stringify(state)));
    await seed(target, { demo: process.env.ENABLE_DEV_LOGIN === 'true' });
    await target.transact(state => {
      for (const [key, rows] of Object.entries(sourceState)) {
        for (const row of rows) {
          const existing = state[key].find(item => item.id === row.id);
          if (existing) {
            // Old PGlite demo rows predate passwords; keep the MySQL seed credential.
            if (key === 'users' && existing.password && !row.password) row.password = existing.password;
            Object.assign(existing, row);
          } else state[key].push(row);
        }
      }
    });
    const totals = Object.fromEntries(Object.entries(sourceState).map(([key, rows]) => [key, rows.length]));
    console.log('PGlite -> MySQL 迁移完成：' + JSON.stringify(totals));
  } finally {
    await source.close();
    await target.close();
  }
})().catch(error => { console.error('PGlite -> MySQL 迁移失败：' + error.message); process.exitCode = 1; });
