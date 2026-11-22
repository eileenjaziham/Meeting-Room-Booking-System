'use strict';
const rooms = [ ['7060', null], ['7081', 12], ['7091', 12], ['7119', 80], ['7052', 35] ].map(([id, capacity]) => ({ id, number: id, capacity, location: '南湖校区综合楼七楼', equipment: '待核实', open: '08:00—22:00', photo: '/assets/meeting.png', photoNote: '原型示意图，非该房间实拍' }));
const demoUsers = [
  { id: 'demo-student', name: '测试学生甲', studentNo: 'DEMO-S001', identityType: 'student', verification: 'approved', phone: '13800000001' },
  { id: 'demo-student2', name: '测试学生乙', studentNo: 'DEMO-S002', identityType: 'student', verification: 'approved', phone: '13800000002' },
  { id: 'demo-teacher', name: '测试教师', studentNo: 'DEMO-T001', identityType: 'teacher', verification: 'approved', phone: '13800000003' },
  { id: 'demo-admin', name: '测试负责人', studentNo: 'DEMO-A001', identityType: 'student', verification: 'approved', phone: '13800000004' },
  { id: 'demo-guest', name: '', studentNo: '', identityType: null, verification: 'unsubmitted', phone: '' }
];
async function seed(db, { demo = false } = {}) {
  await db.transact(state => {
    for (const room of rooms) if (!state.rooms.some(x => x.id === room.id)) state.rooms.push(room);
    if (demo) {
      for (const user of demoUsers) if (!state.users.some(x => x.id === user.id)) state.users.push({ ...user });
      if (!state.grants.some(x => x.id === 'demo-admin')) state.grants.push({ id: 'demo-admin', source: 'local-demo-seed' });
    }
  });
}
module.exports = { seed, rooms, demoUsers };
