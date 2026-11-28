'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { openDatabase } = require('../server/db');
const { seed } = require('../server/seed');

const tableMap = { users: 'users', rooms: 'rooms', grants: 'admin_grants', identities: 'identity_reviews', reservations: 'reservations', requests: 'idempotency', feedback: 'feedback', sessions: 'sessions', blocks: 'room_blocks', notifications: 'notifications', audit: 'audit_logs' };
const config = { host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '', database: process.env.MYSQL_DATABASE || 'meeting_room_booking', multipleStatements: true, charset: 'utf8mb4' };

(async () => {
  const connection = await mysql.createConnection(config);
  let source = {};
  try {
    const [columns] = await connection.query('SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?', ['users']);
    const [backupTables] = await connection.query('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE \'\\\\__json_backup_%\' ESCAPE \'\\\\\'');
    const backupNames = new Set(backupTables.map(row => row.TABLE_NAME || row.table_name));
    const hasOldUsers = columns.some(column => column.COLUMN_NAME === 'data' || column.column_name === 'data');
    if (!hasOldUsers && !backupNames.has('__json_backup_users')) {
      console.log('当前 MySQL 已是规范化结构，无需迁移。');
      return;
    }
    for (const [key, table] of Object.entries(tableMap)) {
      const sourceTable = backupNames.has('__json_backup_' + table) ? '__json_backup_' + table : table;
      const [rows] = await connection.query('SELECT * FROM `' + sourceTable + '`');
      source[key] = rows.map(row => {
        const value = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        if (key === 'grants') value.id = row.user_id;
        else if (!value.id) value.id = row.id;
        if (row.user_id && !value.userId) value.userId = row.user_id;
        if (row.room_id && !value.roomId) value.roomId = row.room_id;
        return value;
      });
    }
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    for (const table of Object.values(tableMap)) if (!backupNames.has('__json_backup_' + table)) await connection.query('RENAME TABLE `' + table + '` TO `__json_backup_' + table + '`');
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
  } finally {
    await connection.end();
  }

  const target = await openDatabase({ driver: 'mysql' });
  try {
    await seed(target, { demo: process.env.ENABLE_DEV_LOGIN === 'true' });
    await target.transact(state => {
      for (const [key, rows] of Object.entries(source)) {
        for (const row of rows) {
          const existing = state[key].find(item => item.id === row.id);
          if (existing) {
            if (key === 'users' && existing.password && !row.password) row.password = existing.password;
            Object.assign(existing, row);
          } else state[key].push(row);
        }
      }
    });
  } catch (error) {
    await target.close();
    throw error;
  }
  await target.close();

  if (process.env.KEEP_MYSQL_JSON_BACKUP !== 'true') {
    const cleanup = await mysql.createConnection(config);
    try {
      await cleanup.query('SET FOREIGN_KEY_CHECKS=0');
      for (const table of Object.values(tableMap)) await cleanup.query('DROP TABLE IF EXISTS `__json_backup_' + table + '`');
      await cleanup.query('SET FOREIGN_KEY_CHECKS=1');
    } finally { await cleanup.end(); }
  }
  console.log('旧 MySQL JSON 表已迁移为规范化字段；记录数：' + JSON.stringify(Object.fromEntries(Object.entries(source).map(([key, rows]) => [key, rows.length]))));
})().catch(error => { console.error('MySQL JSON -> 字段迁移失败：' + error.message); process.exitCode = 1; });
