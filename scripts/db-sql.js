'use strict';
// 由 server/schema.mysql.sql + server/seed.js 生成 database/mysql-init.sql，避免 SQL 与 Node 两份种子各写一遍后漂移。
const fs = require('node:fs');
const path = require('node:path');
const { rooms, demoUsers, adminGrants } = require('../server/seed');

const DEFAULT_DATABASE = 'meeting_room_booking';
const OUTPUT = path.join(__dirname, '..', 'database', 'mysql-init.sql');

function identifier(name) {
  if (!/^[A-Za-z0-9_$]{1,64}$/.test(name)) throw new Error('非法数据库名：' + name + '（只允许字母、数字、下划线和 $）');
  return '`' + name + '`';
}
function value(input) {
  if (input === null || input === undefined) return 'NULL';
  if (typeof input === 'number') return String(input);
  return "'" + String(input).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}
/** columns 为 [SQL 列名, 记录字段名] 对：库里是 snake_case，种子对象是 camelCase。 */
function insert(table, columns, rows, updateColumns, comment) {
  const lines = rows.map(row => '(' + columns.map(([, field]) => value(row[field])).join(',') + ')');
  return [
    comment ? '-- ' + comment : null,
    'INSERT INTO ' + table + ' (' + columns.map(([column]) => column).join(',') + ') VALUES',
    lines.join(',\n'),
    'ON DUPLICATE KEY UPDATE ' + updateColumns.map(column => column + '=VALUES(' + column + ')').join(', ') + ';'
  ].filter(Boolean).join('\n');
}

function render(database = DEFAULT_DATABASE) {
  const name = identifier(database);
  const schema = fs.readFileSync(path.join(__dirname, '..', 'server', 'schema.mysql.sql'), 'utf8').trim();
  const roomsSql = insert('rooms',
    [['id', 'id'], ['number', 'number'], ['capacity', 'capacity'], ['location', 'location'], ['equipment', 'equipment'], ['open_time', 'open'], ['photo', 'photo'], ['photo_note', 'photoNote'], ['settings_version', 'settingsVersion']], rooms,
    ['number', 'capacity', 'location', 'equipment', 'open_time', 'photo', 'photo_note', 'settings_version'], '会议室：五间固定房间，重复执行只刷新资料，不删房间。');
  const usersSql = insert('users',
    [['id', 'id'], ['password', 'password'], ['name', 'name'], ['student_no', 'studentNo'], ['identity_type', 'identityType'], ['verification', 'verification'], ['phone', 'phone']], demoUsers,
    ['password', 'name', 'student_no', 'identity_type', 'verification', 'phone'], '演示账号：仅用于本地开发登录，不代表真实身份；重复执行会把密码重置为默认值。');
  const grantsSql = insert('admin_grants',
    [['user_id', 'id'], ['source', 'source'], ['created_at', 'createdAt']], adminGrants,
    ['source', 'created_at'], '负责人授权：与师生核验状态解耦，只授予演示负责人。');
  return [
    '-- 由 scripts/db-sql.js 依据 server/schema.mysql.sql 与 server/seed.js 生成，请勿手工编辑。',
    '-- 重新生成：npm run db:sql',
    '--',
    '-- 纯 SQL 初始化（需要 MySQL 8.0.16+ 的 mysql 客户端，项目根目录执行）：',
    '--   mysql -uroot -p --default-character-set=utf8mb4 < database/mysql-init.sql',
    '-- 更推荐 npm run db:init：它会按 .env 自动建库、建表、写入同样的初始数据并打印摘要。',
    '--',
    '-- 目标库：' + name + '（改用其他库名时，把文件里三处库名一起替换，或直接跑 npm run db:init）',
    '',
    'SET NAMES utf8mb4;',
    'CREATE DATABASE IF NOT EXISTS ' + name + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    'ALTER DATABASE ' + name + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    'USE ' + name + ';',
    '',
    schema,
    '',
    roomsSql,
    '',
    usersSql,
    '',
    grantsSql,
    '',
    '-- 初始化结果概览',
    "SELECT (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM admin_grants) AS admins;",
    ''
  ].join('\n');
}

function write(database = DEFAULT_DATABASE) {
  const sql = render(database);
  fs.writeFileSync(OUTPUT, sql);
  return { file: OUTPUT, bytes: Buffer.byteLength(sql), rooms: rooms.length, users: demoUsers.length, admins: adminGrants.length };
}

module.exports = { render, write, DEFAULT_DATABASE };

if (require.main === module) {
  const result = write(process.argv[2] || DEFAULT_DATABASE);
  console.log('已生成 ' + path.relative(process.cwd(), result.file) + '：' + result.rooms + ' 间会议室、' + result.users + ' 个账号、' + result.admins + ' 个负责人授权，' + result.bytes + ' 字节。');
}
