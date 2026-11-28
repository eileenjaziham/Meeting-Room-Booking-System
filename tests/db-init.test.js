const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { render } = require('../scripts/db-sql');
const { openDatabase } = require('../server/db');
const { seed, rooms, demoUsers, adminGrants } = require('../server/seed');

const file = path.join(__dirname, '..', 'database', 'mysql-init.sql');
const sql = fs.readFileSync(file, 'utf8');

test('SQL 初始化脚本由 seed.js 生成，改了一边没同步就会失败', () => {
  assert.equal(sql, render(), 'database/mysql-init.sql 与 server/seed.js 不一致，请运行 npm run db:sql');
});

test('SQL 初始化脚本自带会议室、账号与负责人授权', () => {
  for (const room of rooms) assert.ok(sql.includes("('" + room.id + "','" + room.number + "'," + room.capacity + ','), '缺少会议室 ' + room.id);
  for (const user of demoUsers) assert.ok(sql.includes("('" + user.id + "','" + user.password + "'"), '缺少账号 ' + user.id);
  for (const grant of adminGrants) assert.ok(sql.includes("('" + grant.id + "','" + grant.source + "'"), '缺少负责人授权 ' + grant.id);
  // 账号角色靠 identity_type/verification 表达，负责人靠 admin_grants，两者都不能缺列
  assert.ok(sql.includes('identity_type,verification'));
  assert.ok(sql.includes('INSERT INTO admin_grants'));
  assert.match(sql, /未核验|'unsubmitted'/);
});

test('SQL 初始化脚本自包含且中文可读', () => {
  assert.ok(sql.includes('SET NAMES utf8mb4'), '缺少连接字符集设定，Windows 下中文会乱码');
  assert.match(sql, /CREATE DATABASE IF NOT EXISTS `[A-Za-z0-9_$]+`/);
  assert.ok(!/^\s*SOURCE\s/m.test(sql), '不应依赖 mysql 客户端的 SOURCE 命令');
  assert.ok(!/CONVERT\(0x/.test(sql), '中文应直接书写，不要用十六进制转义');
  assert.ok(sql.includes('南湖校区综合楼七楼'));
});

test('库名可替换且拒绝非法值', () => {
  const custom = render('mrb_demo');
  assert.ok(custom.includes('`mrb_demo`'));
  assert.match(custom, /USE `mrb_demo`;/);
  assert.throws(() => render('bad-name!'), /非法数据库名/);
});

test('seed 可重复执行，只补数据不清空，且授权带创建时间', async () => {
  const db = await openDatabase({ driver: 'pglite', path: 'memory://' });
  try {
    await seed(db, { demo: true });
    await seed(db, { demo: true });
    const state = await db.transact(s => ({ rooms: s.rooms, users: s.users, grants: s.grants }));
    assert.equal(state.rooms.length, rooms.length);
    assert.equal(state.users.length, demoUsers.length);
    assert.deepEqual(state.grants.map(x => x.id), adminGrants.map(x => x.id));
    assert.ok(state.grants.every(x => Number.isInteger(x.createdAt) && x.createdAt > 0), '负责人授权应有 created_at');
    assert.equal(state.rooms.find(x => x.id === '7119').capacity, 100);
  } finally {
    await db.close();
  }
});

test('不写演示账号时只播种会议室', async () => {
  const db = await openDatabase({ driver: 'pglite', path: 'memory://' });
  try {
    await seed(db);
    const state = await db.transact(s => ({ rooms: s.rooms.length, users: s.users.length, grants: s.grants.length }));
    assert.deepEqual(state, { rooms: rooms.length, users: 0, grants: 0 });
  } finally {
    await db.close();
  }
});
