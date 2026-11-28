'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const tables = { users: 'users', rooms: 'rooms', grants: 'admin_grants', identities: 'identity_reviews', reservations: 'reservations', requests: 'idempotency', feedback: 'feedback', sessions: 'sessions', blocks: 'room_blocks', notifications: 'notifications', audit: 'audit_logs' };

const mysqlColumns = {
  users: ['id', 'password', 'name', 'student_no', 'identity_type', 'verification', 'phone', 'avatar_url', 'avatar_updated_at'],
  rooms: ['id', 'number', 'capacity', 'location', 'equipment', 'open_time', 'photo', 'photo_note', 'settings_version'],
  grants: ['user_id', 'source', 'created_at'],
  identities: ['id', 'user_id', 'profile_name', 'profile_student_no', 'profile_identity_type', 'profile_phone', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at', 'reason'],
  reservations: ['id', 'user_id', 'room_id', 'date_value', 'start_time', 'end_time', 'start_at', 'end_at', 'responsible_teacher', 'borrower_name', 'purpose', 'attendees', 'phone', 'notes', 'applicant_name', 'student_no', 'identity_type', 'status', 'created_at', 'state_changed_at', 'reviewed_by', 'reviewed_at', 'reason', 'cancelled_by', 'cancelled_at', 'cancellation_type', 'block_id'],
  requests: ['id', 'user_id', 'fingerprint', 'reservation_id', 'created_at'],
  feedback: ['id', 'user_id', 'category', 'content', 'request_id', 'fingerprint', 'status', 'reply', 'replied_by', 'replied_at', 'created_at'],
  sessions: ['id', 'user_id', 'expires_at'],
  blocks: ['id', 'room_id', 'start_date', 'end_date', 'start_time', 'end_time', 'start_at', 'end_at', 'reason', 'request_id', 'fingerprint', 'status', 'created_by', 'created_at', 'cancelled_count', 'released_at', 'released_by', 'release_reason'],
  notifications: ['id', 'user_id', 'reservation_id', 'type', 'content', 'created_at', 'read_at'],
  audit: ['id', 'actor_id', 'object_id', 'operation', 'detail', 'at']
};

function mysqlRow(key, row) {
  if (key === 'users') return { id: row.id, password: row.password, name: row.name, studentNo: row.student_no, identityType: row.identity_type, verification: row.verification, phone: row.phone, ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}), ...(row.avatar_updated_at ? { avatarUpdatedAt: Number(row.avatar_updated_at) } : {}) };
  if (key === 'rooms') return { id: row.id, number: row.number, capacity: row.capacity, location: row.location, equipment: row.equipment, open: row.open_time, photo: row.photo, photoNote: row.photo_note, settingsVersion: row.settings_version };
  if (key === 'grants') return { id: row.user_id, source: row.source, ...(row.created_at ? { createdAt: Number(row.created_at) } : {}) };
  if (key === 'identities') return { id: row.id, userId: row.user_id, profile: { name: row.profile_name, studentNo: row.profile_student_no, identityType: row.profile_identity_type, phone: row.profile_phone }, status: row.status, submittedAt: Number(row.submitted_at), ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}), ...(row.reviewed_at ? { reviewedAt: Number(row.reviewed_at) } : {}), ...(row.reason ? { reason: row.reason } : {}) };
  if (key === 'reservations') return { id: row.id, userId: row.user_id, roomId: row.room_id, date: mysqlDay(row.date_value), start: row.start_time, end: row.end_time, startAt: Number(row.start_at), endAt: Number(row.end_at), responsibleTeacher: row.responsible_teacher, borrowerName: row.borrower_name, purpose: row.purpose, attendees: row.attendees, phone: row.phone, notes: row.notes || '', applicantName: row.applicant_name, studentNo: row.student_no, identityType: row.identity_type, status: row.status, createdAt: Number(row.created_at), ...(row.state_changed_at ? { stateChangedAt: Number(row.state_changed_at) } : {}), ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}), ...(row.reviewed_at ? { reviewedAt: Number(row.reviewed_at) } : {}), ...(row.reason ? { reason: row.reason } : {}), ...(row.cancelled_by ? { cancelledBy: row.cancelled_by } : {}), ...(row.cancelled_at ? { cancelledAt: Number(row.cancelled_at) } : {}), ...(row.cancellation_type ? { cancellationType: row.cancellation_type } : {}), ...(row.block_id ? { blockId: row.block_id } : {}) };
  if (key === 'requests') return { id: row.id, userId: row.user_id, fingerprint: row.fingerprint, reservationId: row.reservation_id, createdAt: Number(row.created_at) };
  if (key === 'feedback') return { id: row.id, userId: row.user_id, category: row.category, content: row.content, requestId: row.request_id, fingerprint: row.fingerprint, status: row.status, ...(row.reply ? { reply: row.reply } : {}), ...(row.replied_by ? { repliedBy: row.replied_by } : {}), ...(row.replied_at ? { repliedAt: Number(row.replied_at) } : {}), createdAt: Number(row.created_at) };
  if (key === 'sessions') return { id: row.id, userId: row.user_id, expiresAt: Number(row.expires_at) };
  if (key === 'blocks') return { id: row.id, roomId: row.room_id, startDate: mysqlDay(row.start_date), endDate: mysqlDay(row.end_date), start: row.start_time, end: row.end_time, startAt: Number(row.start_at), endAt: Number(row.end_at), reason: row.reason, requestId: row.request_id, fingerprint: row.fingerprint, status: row.status, createdBy: row.created_by, createdAt: Number(row.created_at), cancelledCount: row.cancelled_count, ...(row.released_at ? { releasedAt: Number(row.released_at) } : {}), ...(row.released_by ? { releasedBy: row.released_by } : {}), ...(row.release_reason ? { releaseReason: row.release_reason } : {}) };
  if (key === 'notifications') return { id: row.id, userId: row.user_id, reservationId: row.reservation_id, type: row.type, content: row.content, createdAt: Number(row.created_at), ...(row.read_at ? { readAt: Number(row.read_at) } : { readAt: null }) };
  return { id: row.id, actorId: row.actor_id, objectId: row.object_id, operation: row.operation, detail: row.detail, at: Number(row.at) };
}

function mysqlValues(key, row) {
  if (key === 'users') return [row.id, row.password || null, row.name || '', row.studentNo || '', row.identityType || null, row.verification || 'unsubmitted', row.phone || '', row.avatarUrl || null, row.avatarUpdatedAt || null];
  if (key === 'rooms') return [row.id, row.number, row.capacity, row.location, row.equipment, row.open, row.photo, row.photoNote, row.settingsVersion];
  if (key === 'grants') return [row.id, row.source || null, row.createdAt || null];
  if (key === 'identities') return [row.id, row.userId, row.profile.name, row.profile.studentNo, row.profile.identityType, row.profile.phone, row.status, row.submittedAt, row.reviewedBy || null, row.reviewedAt || null, row.reason || null];
  if (key === 'reservations') return [row.id, row.userId, row.roomId, row.date, row.start, row.end, row.startAt, row.endAt, row.responsibleTeacher, row.borrowerName, row.purpose, row.attendees, row.phone, row.notes || '', row.applicantName, row.studentNo, row.identityType, row.status, row.createdAt, row.stateChangedAt || null, row.reviewedBy || null, row.reviewedAt || null, row.reason || null, row.cancelledBy || null, row.cancelledAt || null, row.cancellationType || null, row.blockId || null];
  if (key === 'requests') return [row.id, row.userId, row.fingerprint, row.reservationId, row.createdAt];
  if (key === 'feedback') return [row.id, row.userId, row.category, row.content, row.requestId, row.fingerprint, row.status, row.reply || null, row.repliedBy || null, row.repliedAt || null, row.createdAt];
  if (key === 'sessions') return [row.id, row.userId, row.expiresAt];
  if (key === 'blocks') return [row.id, row.roomId, row.startDate, row.endDate, row.start, row.end, row.startAt, row.endAt, row.reason, row.requestId, row.fingerprint, row.status, row.createdBy, row.createdAt, row.cancelledCount, row.releasedAt || null, row.releasedBy || null, row.releaseReason || null];
  if (key === 'notifications') return [row.id, row.userId, row.reservationId, row.type, row.content, row.createdAt, row.readAt || null];
  return [row.id, row.actorId, row.objectId, row.operation, row.detail || null, row.at];
}

function rowsOf(result, driver) { return driver === 'mysql' ? result[0] : result.rows; }
const pad2 = value => String(value).padStart(2, '0');
/**
 * MySQL 的 DATE 列默认被 mysql2 解析成「本地零点」的 Date 对象，直接 toISOString() 在东八区会退一天，
 * 回写后还会把错误日期永久写进库。统一按本地年月日还原成 YYYY-MM-DD，另一并兼容已开启 dateStrings 的字符串。
 */
function mysqlDay(value) {
  if (!(value instanceof Date)) return value;
  return value.getFullYear() + '-' + pad2(value.getMonth() + 1) + '-' + pad2(value.getDate());
}
function mysqlOptions(options) {
  // dateStrings: ['DATE'] 让 DATE 列直接返回 'YYYY-MM-DD'，避开时区换算；TIME 列已是 CHAR(5)，不受影响。
  const common = { waitForConnections: true, multipleStatements: true, charset: 'utf8mb4', dateStrings: ['DATE'] };
  if (options.url || process.env.MYSQL_URL) return { uri: options.url || process.env.MYSQL_URL, connectionLimit: 5, ...common };
  return {
    host: options.host || process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(options.port || process.env.MYSQL_PORT || 3306),
    user: options.user || process.env.MYSQL_USER || 'root',
    password: options.password === undefined ? process.env.MYSQL_PASSWORD || '' : options.password,
    database: options.database || process.env.MYSQL_DATABASE || 'meeting_room_booking',
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 5), ...common
  };
}

/** Supports the existing PGlite/PG adapters and a MySQL 8 connection pool. */
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
  } else if (driver === 'mysql') {
    const mysql = require('mysql2/promise');
    const config = mysqlOptions(options);
    if (config.uri) { const uri = config.uri; delete config.uri; db = mysql.createPool(uri, config); }
    else db = mysql.createPool(config);
  } else throw new Error('不支持的 DB_DRIVER: ' + driver);

  if (options.initialize !== false) {
    const schemaFile = driver === 'mysql' ? 'schema.mysql.sql' : 'schema.sql';
    const schema = await fs.readFile(path.join(__dirname, schemaFile), 'utf8');
    if (driver === 'pglite') await db.exec(schema); else await db.query(schema);
    // 旧库的 rooms.photo 是 VARCHAR(255)，无法容纳小程序上传的图片数据地址，启动时就地升级。
    if (driver === 'mysql') {
      const [columns] = await db.query("SELECT DATA_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='rooms' AND COLUMN_NAME='photo'");
      if (columns.length && String(columns[0].type).toLowerCase() !== 'mediumtext') await db.query('ALTER TABLE rooms MODIFY photo MEDIUMTEXT NULL');
      // 修复历史数据：DATE 列曾被当成 UTC 读成前一天并回写，导致 page 上的日期与 start_at/end_at 不一致，
      // 审批时按被改错的日期重算开始时间，会误判为「已经过去」而无法审核。时间戳是权威值，按它回填日期。
      const beijingDay = ms => new Date(Number(ms) + 8 * 3600000).toISOString().slice(0, 10);
      let repaired = 0;
      const [reservationRows] = await db.query('SELECT id, date_value, start_at FROM reservations');
      for (const row of reservationRows) {
        const expected = beijingDay(row.start_at);
        if (mysqlDay(row.date_value) === expected) continue;
        await db.query('UPDATE reservations SET date_value=? WHERE id=?', [expected, row.id]);
        repaired++;
      }
      const [blockRows] = await db.query('SELECT id, start_date, end_date, start_at, end_at FROM room_blocks');
      for (const row of blockRows) {
        const startDate = beijingDay(row.start_at), endDate = beijingDay(row.end_at);
        if (mysqlDay(row.start_date) === startDate && mysqlDay(row.end_date) === endDate) continue;
        await db.query('UPDATE room_blocks SET start_date=?, end_date=? WHERE id=?', [startDate, endDate, row.id]);
        repaired++;
      }
      if (repaired) console.log('已按时间戳修复 ' + repaired + ' 条被时区读错的日期列');
    }
  }

  let tail = Promise.resolve();
  async function transact(fn) {
    const previous = tail;
    let release;
    tail = new Promise(resolve => { release = resolve; });
    await previous;
    let client;
    try {
      client = driver === 'pg' ? await db.connect() : driver === 'mysql' ? await db.getConnection() : db;
      await client.query(driver === 'mysql' ? 'START TRANSACTION' : 'BEGIN ISOLATION LEVEL READ COMMITTED');
      await client.query('SELECT id FROM app_lock WHERE id=1 FOR UPDATE');
      const state = {};
      const original = {};
      for (const [key, table] of Object.entries(tables)) {
        const result = await client.query('SELECT ' + (driver === 'mysql' ? '*' : 'data') + ' FROM ' + table);
        state[key] = rowsOf(result, driver).map(row => driver === 'mysql' ? mysqlRow(key, row) : row.data);
        original[key] = new Map(state[key].map(row => [row.id, JSON.stringify(row)]));
      }
      const result = await fn(state);
      for (const [key, table] of Object.entries(tables)) {
        const pk = key === 'grants' ? 'user_id' : 'id';
        const currentIds = new Set(state[key].map(row => row.id));
        for (const id of original[key].keys()) if (!currentIds.has(id)) {
          await client.query('DELETE FROM ' + table + ' WHERE ' + pk + (driver === 'mysql' ? '=?' : '=$1'), [id]);
        }
        for (const row of state[key]) {
          const json = JSON.stringify(row);
          if (original[key].get(row.id) === json) continue;
          if (driver === 'mysql') {
            const cols = mysqlColumns[key], args = mysqlValues(key, row);
            const placeholders = cols.map(() => '?').join(',');
            const updates = cols.filter(column => column !== pk).map(column => column + '=VALUES(' + column + ')').join(',');
            await client.query('INSERT INTO ' + table + ' (' + cols.join(',') + ') VALUES (' + placeholders + ') ON DUPLICATE KEY UPDATE ' + updates, args);
          } else {
            const cols = [pk, 'data'];
            const args = [row.id, json];
            if (['identities', 'reservations', 'requests', 'feedback', 'sessions', 'notifications'].includes(key)) { cols.push('user_id'); args.push(row.userId); }
            if (['reservations', 'blocks'].includes(key)) { cols.push('room_id'); args.push(row.roomId); }
            const placeholders = args.map((_, i) => '$' + (i + 1)).join(',');
            await client.query('INSERT INTO ' + table + ' (' + cols.join(',') + ') VALUES (' + placeholders + ') ON CONFLICT (' + pk + ') DO UPDATE SET data=EXCLUDED.data', args);
          }
        }
      }
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (driver === 'pg' && client || driver === 'mysql' && client) client.release();
      release();
    }
  }
  return { driver, transact, close: () => driver === 'pglite' ? db.close() : db.end() };
}
module.exports = { openDatabase, mysqlDay };
