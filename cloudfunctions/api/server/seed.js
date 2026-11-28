'use strict';
// 初始化数据的唯一来源：server/schema.mysql.sql 与 database/mysql-init.sql 都由这里派生。
// 2026-11-23用户明确指定以Pixso为准；提取证据见design/room-settings.json。
const SEEDED_AT = Date.parse('2026-01-01T00:00:00+08:00');
const ROOM_LOCATION = '南湖校区综合楼七楼';
const ROOM_OPEN = '08:00—22:00';
const rooms = [
  { id: '7060', number: '7060', capacity: 10, location: ROOM_LOCATION, equipment: '屏幕', open: ROOM_OPEN, photo: '/assets/meeting.png', photoNote: '原型示意图，非该房间实拍', settingsVersion: 'pixso-2026-11-23' },
  { id: '7081', number: '7081', capacity: 10, location: ROOM_LOCATION, equipment: '屏幕', open: ROOM_OPEN, photo: '/assets/meeting.png', photoNote: '原型示意图，非该房间实拍', settingsVersion: 'pixso-2026-11-23' },
  { id: '7091', number: '7091', capacity: 10, location: ROOM_LOCATION, equipment: '屏幕', open: ROOM_OPEN, photo: '/assets/meeting.png', photoNote: '原型示意图，非该房间实拍', settingsVersion: 'pixso-2026-11-23' },
  { id: '7119', number: '7119', capacity: 100, location: ROOM_LOCATION, equipment: '投影、音响、话筒', open: ROOM_OPEN, photo: '/assets/meeting.png', photoNote: '原型示意图，非该房间实拍', settingsVersion: 'pixso-2026-11-23' },
  { id: '7052', number: '7052', capacity: 40, location: ROOM_LOCATION, equipment: '屏幕', open: ROOM_OPEN, photo: '/assets/meeting.png', photoNote: '原型示意图，非该房间实拍', settingsVersion: 'pixso-2026-11-23' }
];
const demoUsers = [
  { id: 'demo-student', password: 'student123', name: '测试学生甲', studentNo: 'DEMO-S001', identityType: 'student', verification: 'approved', phone: '13800000001' },
  { id: 'demo-student2', password: 'student123', name: '测试学生乙', studentNo: 'DEMO-S002', identityType: 'student', verification: 'approved', phone: '13800000002' },
  { id: 'demo-teacher', password: 'teacher123', name: '测试教师', studentNo: 'DEMO-T001', identityType: 'teacher', verification: 'approved', phone: '13800000003' },
  { id: 'demo-admin', password: 'admin123', name: '测试负责人', studentNo: 'DEMO-A001', identityType: 'student', verification: 'approved', phone: '13800000004' },
  { id: 'demo-guest', password: 'guest123', name: '', studentNo: '', identityType: null, verification: 'unsubmitted', phone: '' }
];
// 负责人权限单独存在 admin_grants，与师生核验状态解耦；种子只授予演示负责人一个账号。
const adminGrants = [{ id: 'demo-admin', source: 'local-demo-seed', createdAt: SEEDED_AT }];
/** 角色标签只用于初始化摘要与文档，不落库：身份看 users.identityType/verification，负责人看 admin_grants。 */
function roleOf(user) {
  if (adminGrants.some(x => x.id === user.id)) return '负责人';
  if (user.verification !== 'approved') return '未核验';
  return user.identityType === 'teacher' ? '教师' : '学生';
}
async function seed(db, { demo = false } = {}) {
  await db.transact(state => {
    for (const room of rooms) {
      const existing = state.rooms.find(x => x.id === room.id);
      if (!existing) state.rooms.push({ ...room });
      else if (existing.settingsVersion !== room.settingsVersion) Object.assign(existing, { capacity: room.capacity, equipment: room.equipment, settingsVersion: room.settingsVersion });
    }
    if (demo) {
      for (const user of demoUsers) {
        const existing = state.users.find(x => x.id === user.id);
        if (existing) for (const field of ['password', 'name', 'studentNo', 'identityType', 'verification', 'phone']) existing[field] = user[field];
        else state.users.push({ ...user });
      }
      for (const grant of adminGrants) {
        const existing = state.grants.find(x => x.id === grant.id);
        if (!existing) state.grants.push({ ...grant });
        else if (!existing.createdAt) existing.createdAt = grant.createdAt;
      }
    }
  });
}
module.exports = { seed, rooms, demoUsers, adminGrants, roleOf, SEEDED_AT };
