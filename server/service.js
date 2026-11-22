'use strict';
const { randomUUID, createHash } = require('node:crypto');
class BusinessError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
function fail(code, message, status) { throw new BusinessError(code, message, status); }
function text(value, name, max, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail('VALIDATION', name + '长度应为 ' + min + '—' + max + ' 字');
  return value.trim();
}
function phone(value) {
  if (typeof value !== 'string' || !/^1[3-9]\d{9}$/.test(value)) fail('VALIDATION', '请输入中国大陆 11 位手机号（仅格式校验）');
  return value;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('VALIDATION', '日期格式应为 YYYY-MM-DD');
  const ts = Date.parse(value + 'T00:00:00+08:00');
  if (!Number.isFinite(ts) || new Date(ts + 8 * 3600000).toISOString().slice(0, 10) !== value) fail('VALIDATION', '日期不存在');
  return value;
}
function minutes(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail('VALIDATION', '时间须精确到分钟，格式 HH:mm');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
function interval(input, now) {
  const day = date(input.date), start = minutes(input.start), end = minutes(input.end);
  if (start < 480 || end > 1320 || start >= end) fail('TIME_RANGE', '请选择同一天 08:00—22:00 内开始早于结束的时间');
  const startAt = Date.parse(day + 'T' + input.start + ':00+08:00');
  const endAt = Date.parse(day + 'T' + input.end + ':00+08:00');
  if (startAt <= now) fail('PAST_TIME', '开始时间必须晚于服务器当前北京时间');
  return { date: day, start: input.start, end: input.end, startAt, endAt };
}
function effective(row, now) {
  if (row.status === 'pending' && row.startAt <= now) return 'expired';
  if (row.status === 'approved' && row.endAt <= now) return 'completed';
  return row.status;
}
function active(row) { return row.status === 'pending' || row.status === 'approved'; }
function capacity(room, attendees) {
  if (!Number.isSafeInteger(attendees) || attendees <= 0) fail('VALIDATION', '预计人数须为正整数');
  if (room.capacity !== null && attendees > room.capacity) fail('CAPACITY', '人数超过会议室容量 ' + room.capacity + ' 人');
}
function conflict(state, row, exceptId) {
  if (state.reservations.some(x => x.id !== exceptId && active(x) && x.roomId === row.roomId && row.startAt < x.endAt && row.endAt > x.startAt)) fail('CONFLICT', '该时间与已有占用冲突，请刷新日程后重新选择', 409);
}
const hash = value => createHash('sha256').update(value).digest('hex');
const labels = { pending: '待确认', approved: '预约成功', rejected: '已拒绝', cancelled: '已取消', expired: '已失效', completed: '已完成' };

function createService(db, { clock = Date.now } = {}) {
  async function execute(actorId, action, input = {}) {
    if (!actorId) fail('UNAUTHENTICATED', '请先登录', 401);
    if (typeof action !== 'string') fail('VALIDATION', '缺少有效操作名');
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('VALIDATION', '请求参数应为对象');
    return db.transact(state => {
      const now = clock();
      const user = state.users.find(x => x.id === actorId);
      if (!user) fail('UNAUTHENTICATED', '登录会话不存在', 401);
      const isAdmin = state.grants.some(x => x.id === actorId);
      const audit = (objectId, operation, detail = '') => state.audit.push({ id: randomUUID(), actorId, objectId, operation, detail, at: now });
      for (const row of state.reservations) {
        const status = effective(row, now);
        if (status !== row.status) { row.status = status; row.stateChangedAt = now; }
      }
      const verified = () => { if (user.verification !== 'approved' || !['student', 'teacher'].includes(user.identityType)) fail('IDENTITY_REQUIRED', '请先完成身份核验', 403); };
      const admin = () => { if (!isAdmin) fail('FORBIDDEN', '仅独立授权的办公室负责人可操作', 403); };
      const publicUser = u => ({ ...u, isAdmin: state.grants.some(x => x.id === u.id) });
      const view = row => ({ ...row, statusText: labels[row.status], canCancel: row.userId === actorId && active(row) && row.startAt > now, room: state.rooms.find(x => x.id === row.roomId) });
      const findReservation = () => { const row = state.reservations.find(x => x.id === input.id); if (!row) fail('NOT_FOUND', '预约不存在', 404); return row; };
      if (action === 'me') return { user: publicUser(user), identityHistory: state.identities.filter(x => x.userId === actorId).sort((a,b)=>b.submittedAt-a.submittedAt), serverNow: now };
      if (action === 'identity.submit') {
        if (user.verification === 'approved' || user.verification === 'pending') fail('STATE', '已通过或待审核的身份不能重复修改', 409);
        const profile = { name: text(input.name, '姓名', 50), studentNo: text(input.studentNo, '学工号', 30), identityType: input.identityType, phone: phone(input.phone) };
        if (!['student', 'teacher'].includes(profile.identityType)) fail('VALIDATION', '请选择学生或教师身份');
        if (state.users.some(x => x.id !== actorId && x.verification === 'approved' && x.studentNo === profile.studentNo)) fail('IDENTITY_CONFLICT', '学工号无法绑定，请联系负责人', 409);
        const record = { id: randomUUID(), userId: actorId, profile, status: 'pending', submittedAt: now };
        state.identities.push(record);
        user.verification = 'pending';
        audit(record.id, 'identity.submit');
        return record;
      }
      if (action.startsWith('admin.')) admin(); else verified();
      if (action === 'rooms.list' || action === 'rooms.detail') {
        const day = date(input.date);
        const selected = action === 'rooms.detail' ? state.rooms.filter(x => x.id === input.roomId) : state.rooms;
        if (!selected.length) fail('NOT_FOUND', '会议室不存在', 404);
        const result = selected.map(room => ({ ...room, occupied: state.reservations.filter(x => x.roomId === room.id && x.date === day && active(x)).sort((a,b)=>a.startAt-b.startAt).map(x => ({ start: x.start, end: x.end, label: '已占用' })) }));
        return action === 'rooms.detail' ? result[0] : result;
      }
      if (action === 'reservation.create') {
        const requestKey = text(input.requestId, '请求标识', 100, 8);
        // 只对业务字段计算摘要，客户端角色/最终状态等不参与权威决策。
        const payload = { roomId: input.roomId, date: input.date, start: input.start, end: input.end, purpose: input.purpose, attendees: input.attendees, phone: input.phone, notes: input.notes || '' };
        const fingerprint = hash(JSON.stringify(payload));
        const requestId = hash(actorId + ':' + requestKey);
        const previous = state.requests.find(x => x.id === requestId);
        if (previous) {
          if (previous.fingerprint !== fingerprint) fail('IDEMPOTENCY_MISMATCH', '同一请求标识不能用于不同内容', 409);
          return { ...view(state.reservations.find(x => x.id === previous.reservationId)), replayed: true };
        }
        const room = state.rooms.find(x => x.id === input.roomId);
        if (!room) fail('NOT_FOUND', '会议室不存在', 404);
        const time = interval(input, now);
        capacity(room, input.attendees);
        const row = { id: randomUUID(), userId: actorId, roomId: room.id, ...time, purpose: text(input.purpose, '用途', 200), attendees: input.attendees, phone: phone(input.phone), notes: text(input.notes || '', '备注', 500, 0), applicantName: user.name, studentNo: user.studentNo, identityType: user.identityType, status: user.identityType === 'teacher' ? 'approved' : 'pending', createdAt: now };
        conflict(state, row);
        state.reservations.push(row);
        state.requests.push({ id: requestId, userId: actorId, fingerprint, reservationId: row.id, createdAt: now });
        audit(row.id, 'reservation.create');
        return view(row);
      }
      if (action === 'reservation.mine') {
        if (input.date) date(input.date);
        return state.reservations.filter(x => x.userId === actorId && (!input.status || x.status === input.status) && (!input.date || x.date === input.date)).sort((a,b)=>b.startAt-a.startAt).map(view);
      }
      if (action === 'reservation.detail') {
        const row = findReservation();
        if (row.userId !== actorId) fail('FORBIDDEN', '只能查看本人的预约详情', 403);
        return view(row);
      }
      if (action === 'reservation.cancel') {
        const row = findReservation();
        if (row.userId !== actorId) fail('FORBIDDEN', '只能取消本人的预约', 403);
        if (!active(row) || row.startAt <= now) fail('STATE', '仅能取消尚未开始的有效预约', 409);
        Object.assign(row, { status: 'cancelled', cancelledBy: actorId, cancelledAt: now, reason: '本人取消' });
        audit(row.id, 'reservation.cancel');
        return view(row);
      }
      if (action === 'admin.dashboard') return { reservations: state.reservations.filter(x=>x.status==='pending').length, identities: state.identities.filter(x=>x.status==='pending').length, total: state.reservations.length };
      if (action === 'admin.reservations') {
        if (input.date) date(input.date);
        return state.reservations.filter(x => (!input.roomId || x.roomId === input.roomId) && (!input.date || x.date === input.date) && (!input.status || x.status === input.status) && (!input.applicant || x.applicantName.includes(input.applicant) || x.studentNo.includes(input.applicant))).sort((a,b)=>b.createdAt-a.createdAt).map(view);
      }
      if (action === 'admin.reservationDetail') return view(findReservation());
      if (action === 'admin.reviewReservation') {
        const row = findReservation();
        if (row.status !== 'pending' || row.startAt <= now) fail('STATE', '申请已处理或已失效，请刷新', 409);
        if (!['approve', 'reject'].includes(input.decision)) fail('VALIDATION', '审核决定无效');
        let reason = '';
        if (input.decision === 'reject') reason = text(input.reason, '拒绝原因', 500);
        else {
          const applicant = state.users.find(x => x.id === row.userId);
          if (!applicant || applicant.verification !== 'approved' || applicant.identityType !== 'student') fail('IDENTITY_REQUIRED', '申请人的学生资格已不符合要求', 409);
          capacity(state.rooms.find(x=>x.id===row.roomId), row.attendees);
          conflict(state, row, row.id);
        }
        Object.assign(row, { status: input.decision === 'approve' ? 'approved' : 'rejected', reviewedBy: actorId, reviewedAt: now, reason });
        audit(row.id, 'reservation.' + input.decision, reason);
        return view(row);
      }
      if (action === 'admin.identities') return state.identities.filter(x => !input.status || x.status === input.status).sort((a,b)=>b.submittedAt-a.submittedAt);
      if (action === 'admin.reviewIdentity') {
        const row = state.identities.find(x => x.id === input.id);
        if (!row) fail('NOT_FOUND', '身份审核不存在', 404);
        if (row.status !== 'pending') fail('STATE', '身份申请已被处理', 409);
        if (!['approve','reject'].includes(input.decision)) fail('VALIDATION', '审核决定无效');
        const owner = state.users.find(x=>x.id===row.userId);
        let reason = '';
        if (input.decision === 'approve') {
          if (state.users.some(x => x.id !== row.userId && x.verification === 'approved' && x.studentNo === row.profile.studentNo)) fail('IDENTITY_CONFLICT', '学工号无法绑定，请联系负责人', 409);
          Object.assign(owner, row.profile, { verification: 'approved' });
        } else { reason = text(input.reason, '拒绝原因', 500); owner.verification = 'rejected'; }
        Object.assign(row, { status: input.decision === 'approve' ? 'approved' : 'rejected', reviewedBy: actorId, reviewedAt: now, reason });
        audit(row.id, 'identity.' + input.decision, reason);
        return row;
      }
      fail('NOT_FOUND', '接口不存在', 404);
    });
  }
  return { execute };
}
module.exports = { createService, BusinessError, effective, interval, date, labels };
