'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const tables = { users: 'users', rooms: 'rooms', grants: 'admin_grants', identities: 'identity_reviews', reservations: 'reservations', requests: 'idempotency', audit: 'audit_logs' };

/** PostgreSQL 和 PGlite 使用同一 schema / SQL / 业务代码。所有写入均在数据库行锁内。 */
async function openDatabase(options = {}) {
  const driver = options.driver || process.env.DB_DRIVER || 'pglite';
  let db;
  if (driver === 'pglite') {
    const { PGlite } = require('@electric-sql/pglite');
    db = new PGlite(options.path || process.env.LOCAL_DB_PATH || './data/local');
    await db.waitReady;
  } else if (driver === 'pg') {
    const { Pool } = require('pg');
    let ssl;
    if (process.env.PG_SSL === 'true') ssl = { rejectUnauthorized: true, ...(process.env.PG_CA_FILE ? { ca: await fs.readFile(process.env.PG_CA_FILE, 'utf8') } : {}) };
    db = new Pool({ connectionString: options.url || process.env.DATABASE_URL, ssl, max: 5 });
  } else throw new Error('不支持的 DB_DRIVER');
  if (options.initialize !== false) {
    const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
    if (driver === 'pglite') await db.exec(schema); else await db.query(schema);
  }
  let tail = Promise.resolve();
  async function transact(fn) {
    // PGlite 是单连接；队列避免同一连接内 BEGIN 交错。PG 的跨进程保障来自 FOR UPDATE。
    const previous = tail;
    let release;
    tail = new Promise(resolve => { release = resolve; });
    await previous;
    let client;
    try {
      client = driver === 'pg' ? await db.connect() : db;
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      await client.query('SELECT id FROM app_lock WHERE id=1 FOR UPDATE');
      const state = {};
      const original = {};
      for (const [key, table] of Object.entries(tables)) {
        const result = await client.query('SELECT data FROM ' + table);
        state[key] = result.rows.map(row => row.data);
        original[key] = new Map(state[key].map(row => [row.id, JSON.stringify(row)]));
      }
      const result = await fn(state);
      for (const [key, table] of Object.entries(tables)) {
        for (const row of state[key]) {
          const json = JSON.stringify(row);
          if (original[key].get(row.id) === json) continue;
          const pk = key === 'grants' ? 'user_id' : 'id';
          let cols = [pk, 'data'];
          let args = [row.id, json];
          if (['identities', 'reservations', 'requests'].includes(key)) { cols.push('user_id'); args.push(row.userId); }
          if (key === 'reservations') { cols.push('room_id'); args.push(row.roomId); }
          await client.query('INSERT INTO ' + table + ' (' + cols.join(',') + ') VALUES (' + args.map((_, i) => '$' + (i + 1)).join(',') + ') ON CONFLICT (' + pk + ') DO UPDATE SET data=EXCLUDED.data', args);
        }
      }
      await client.query('COMMIT');
      return result;
    } catch (error) { if (client) await client.query('ROLLBACK'); throw error; }
    finally { if (driver === 'pg' && client) client.release(); release(); }
  }
  return { driver, transact, close: () => driver === 'pg' ? db.end() : db.close() };
}
module.exports = { openDatabase };
