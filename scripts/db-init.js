'use strict';
// 本地一键初始化：按 .env 建库 → 建表/补表 → 写入会议室与演示账号 → 打印摘要。
// 幂等：重复执行不会删除已有房间、预约或用户，只补缺失记录并刷新seed资料。
const path = require('node:path');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log([
    '用法：npm run db:init [-- --demo | --no-demo]',
    '',
    '  （无参数）  按 .env 的 ENABLE_DEV_LOGIN 决定是否写入演示账号',
    '  --demo      强制写入演示账号和负责人授权（本地演示用）',
    '  --no-demo   只建库建表和会议室，不写任何账号（云环境用）',
    '',
    'MySQL 会先用连接串里的账号建库（库不存在时自动创建），再交给服务端 schema 建表。'
  ].join('\n'));
  process.exit(0);
}
const demoFlag = args.includes('--demo') ? true : args.includes('--no-demo') ? false : null;

// 直接 node scripts/db-init.js 时也能读到 .env（npm 脚本已通过 --env-file-if-exists 注入，不会重复覆盖）。
for (const file of ['.env']) {
  try {
    if (typeof process.loadEnvFile === 'function') process.loadEnvFile(path.join(__dirname, '..', file));
  } catch { /* 没有 .env 就用默认值 */ }
}

const { openDatabase } = require('../server/db');
const { seed } = require('../server/seed');

const DB_NAME_PATTERN = /^[A-Za-z0-9_$]{1,64}$/;
function mysqlTarget() {
  const url = process.env.MYSQL_URL;
  if (url) {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'meeting_room_booking';
    return { database, label: parsed.host, url: parsed };
  }
  return {
    database: process.env.MYSQL_DATABASE || 'meeting_room_booking',
    label: (process.env.MYSQL_HOST || '127.0.0.1') + ':' + (process.env.MYSQL_PORT || 3306)
  };
}

/** 服务端连库前必须先有库本身：mysql2 不会替我们创建，空机器上直接连会报 ER_BAD_DB_ERROR。 */
async function ensureMysqlDatabase() {
  const mysql = require('mysql2/promise');
  const target = mysqlTarget();
  if (!DB_NAME_PATTERN.test(target.database)) throw new Error('MYSQL_DATABASE 只能是字母、数字、下划线和 $：' + target.database);
  let connection;
  try {
    connection = target.url
      ? await mysql.createConnection(Object.assign(target.url, { pathname: '/' }).toString())
      : await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        charset: 'utf8mb4'
      });
  } catch (error) {
    throw new Error('连不上 MySQL（' + target.label + '）：' + error.message + '\n请确认 MySQL 已启动、.env 里的账号密码正确；只想零依赖本地跑可改用 DB_DRIVER=pglite。');
  }
  try {
    const [versions] = await connection.query('SELECT VERSION() AS version');
    const version = String(versions[0].version);
    const [major, minor, patch] = version.split('.').map(part => parseInt(part, 10) || 0);
    if (major * 10000 + minor * 100 + patch < 80016) throw new Error('MySQL 版本 ' + version + ' 过低：schema 使用 CHECK 约束，需要 8.0.16 及以上。');
    const [existing] = await connection.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [target.database]);
    const database = '`' + target.database + '`';
    await connection.query('CREATE DATABASE IF NOT EXISTS ' + database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.query('ALTER DATABASE ' + database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    return { ...target, version, created: existing.length === 0 };
  } finally {
    await connection.end();
  }
}

function roleOf(user, grants) {
  if (grants.includes(user.id)) return '负责人';
  if (user.verification !== 'approved') return '未核验';
  return user.identityType === 'teacher' ? '教师' : '学生';
}

(async () => {
  const driver = process.env.DB_DRIVER || 'pglite';
  const demo = demoFlag === null ? process.env.ENABLE_DEV_LOGIN === 'true' : demoFlag;
  const target = driver === 'mysql' ? await ensureMysqlDatabase() : null;

  const db = await openDatabase();
  try {
    await seed(db, { demo });
    const state = await db.transact(s => ({
      rooms: s.rooms.map(room => ({ id: room.id, capacity: room.capacity })),
      users: s.users.map(user => ({ id: user.id, name: user.name, verification: user.verification, identityType: user.identityType })),
      grants: s.grants.map(grant => grant.id)
    }));
    const roles = state.users.reduce((count, user) => { const role = roleOf(user, state.grants); count[role] = (count[role] || 0) + 1; return count; }, {});
    const lines = [
      '数据库初始化完成',
      '  驱动      ' + driver + (target ? '（MySQL ' + target.version + '）' : ''),
      target
        ? '  目标库    ' + target.database + ' @ ' + target.label + '（' + (target.created ? '新建' : '已存在，只补缺失的表和数据') + '）'
        : '  目标库    ' + (process.env.DATABASE_URL ? 'DATABASE_URL' : process.env.LOCAL_DB_PATH || './data/local'),
      '  表结构    已按 server/schema 建好或补全',
      '  会议室    ' + state.rooms.length + ' 间：' + state.rooms.map(room => room.id + ' ' + room.capacity + '人').join(' · '),
      '  账号      ' + state.users.length + ' 个' + (state.users.length ? '：' + Object.entries(roles).map(([role, count]) => role + ' ' + count).join('、') : ''),
      '  负责人    ' + (state.grants.length ? state.grants.join('、') : '无')
    ];
    if (demo) lines.push('  演示数据  已写入，重复执行会把演示密码重置为默认值');
    else lines.push('  演示数据  未写入（ENABLE_DEV_LOGIN≠true）：本地没有可登录账号，加 --demo 或改 .env 后重跑');
    lines.push('  下一步    npm start，然后用 demo-admin / admin123（负责人）或 demo-student / student123（学生）登录');
    console.log(lines.join('\n'));
  } finally {
    await db.close();
  }
})().catch(error => {
  console.error('初始化失败：' + error.message);
  process.exitCode = 1;
});
