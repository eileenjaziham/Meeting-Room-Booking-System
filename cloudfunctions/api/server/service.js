'use strict';
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const bookingPolicy = require('../shared/booking-policy.json');
const DAY = 86400000;
const CANCELLATION_LEAD = bookingPolicy.selfCancellationLeadHours * 3600000;
function bookingWindow(now) {
  const first = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
  const last = new Date(Date.parse(first + 'T00:00:00+08:00') + bookingPolicy.maxAdvanceDays * DAY + 8 * 3600000).toISOString().slice(0, 10);
  return { first, last, days: bookingPolicy.bookingDays, maxAdvanceDays: bookingPolicy.maxAdvanceDays, manager: bookingPolicy.manager };
}
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
function avatar(value){
  const maxBytes=64*1024;
  if(typeof value!=='string'||value.length>24+Math.ceil(maxBytes/3)*4)fail('AVATAR_SIZE','头像不能超过64KB，请选择较小的图片',413);
  const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match)fail('VALIDATION','请选择PNG或JPG格式的头像');
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>maxBytes)fail('AVATAR_SIZE','头像不能超过64KB，请选择较小的图片',413);
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!valid||bytes.toString('base64')!==match[2])fail('VALIDATION','头像图片格式无效，请重新选择');
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
  const window = bookingWindow(now);
  if (day > window.last) fail('BOOKING_WINDOW', '仅可预约含今天在内的7天（今天至' + window.last + '）；更晚日期请联系曹闯老师申请，QQ：28061535');
  return { date: day, start: input.start, end: input.end, startAt, endAt };
}
function effective(row, now) {
  if (row.status === 'pending' && row.startAt <= now) return 'expired';
  if (row.status === 'approved' && row.endAt <= now) return 'completed';
  return row.status;
}
function active(row) { return row.status === 'pending' || row.status === 'approved'; }
function blockRange(input,now){
  const startDate=date(input.startDate),endDate=date(input.endDate),start=minutes(input.start),end=minutes(input.end);
  const startAt=Date.parse(startDate+'T'+input.start+':00+08:00'),endAt=Date.parse(endDate+'T'+input.end+':00+08:00');
  if(start<480||start>=1320||end<=480||end>1320||startAt>=endAt||endAt<=now)fail('TIME_RANGE','停用须在08:00—22:00开放时段内，结束时间须晚于开始和当前时间');
  return {startDate,endDate,start:input.start,end:input.end,startAt,endAt};
}
function liveBlock(block,now){return block.status==='active'&&block.endAt>now;}
function capacity(room, attendees) {
  if (!Number.isSafeInteger(attendees) || attendees <= 0) fail('VALIDATION', '预计人数须为正整数');
  if (room.capacity !== null && attendees > room.capacity) fail('CAPACITY', '人数超过会议室容量 ' + room.capacity + ' 人');
}
function conflict(state, row, exceptId) {
  if(state.blocks.some(block=>block.status==='active'&&block.roomId===row.roomId&&row.startAt<block.endAt&&row.endAt>block.startAt))fail('ROOM_UNAVAILABLE','该会议室在所选时段停用，请选择其他空闲时间',409);
  const occupied=state.reservations.find(x => x.id !== exceptId && active(x) && x.roomId === row.roomId && row.startAt < x.endAt && row.endAt > x.startAt);
  if (occupied) fail('CONFLICT', occupied.start + '—' + occupied.end + ' 已被预约，请刷新日程后选择其他空闲时段', 409);
}
const hash = value => createHash('sha256').update(value).digest('hex');
const labels = { pending: '待确认', approved: '预约成功', rejected: '已拒绝', cancelled: '已取消', expired: '已失效', completed: '已完成' };
const feedbackCategories = { usage: '使用问题', reservation: '预约问题', suggestion: '功能建议', other: '其他反馈' };
const feedbackView = row => ({ id: row.id, category: row.category, categoryText: feedbackCategories[row.category], content: row.content, status: row.status, statusText: row.status === 'replied' ? '已回复' : '待处理', reply: row.reply || '', createdAt: row.createdAt, repliedAt: row.repliedAt || null });

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
      const notifyReservation=(row,type,message)=>state.notifications.push({id:randomUUID(),userId:row.userId,reservationId:row.id,type,content:row.roomId+'会议室 '+row.date+' '+row.start+'—'+row.end+' '+message,createdAt:now,readAt:null});
      for (const row of state.reservations) {
        const status = effective(row, now);
        if (status !== row.status) { row.status = status; row.stateChangedAt = now;if(status==='expired')notifyReservation(row,'reservation-expired','的申请因开始时仍未审核已失效。'); }
      }
      const verified = () => { if (user.verification !== 'approved' || !['student', 'teacher'].includes(user.identityType)) fail('IDENTITY_REQUIRED', '请先完成身份核验', 403); };
      const admin = () => { if (!isAdmin) fail('FORBIDDEN', '仅独立授权的办公室负责人可操作', 403); };
      const publicUser = u => ({ ...u, isAdmin: state.grants.some(x => x.id === u.id) });
      const view = row => ({ ...row, statusText: labels[row.status], canCancel: row.userId === actorId && active(row) && row.startAt - now >= CANCELLATION_LEAD, canAdminCancel:isAdmin && active(row), cancelDeadline:row.startAt-CANCELLATION_LEAD, ...(row.status==='approved'&&(row.userId===actorId||isAdmin)?{accessCode:row.roomId+'1234#'}:{}), room: state.rooms.find(x => x.id === row.roomId) });
      const findReservation = () => { const row = state.reservations.find(x => x.id === input.id); if (!row) fail('NOT_FOUND', '预约不存在', 404); return row; };
      if (action === 'me') {
        const bookingDates={};for(const row of state.reservations)if(row.userId===actorId&&active(row))bookingDates[row.date]=(bookingDates[row.date]||0)+1;
        return { user: publicUser(user), identityHistory: state.identities.filter(x => x.userId === actorId).sort((a,b)=>b.submittedAt-a.submittedAt), serverNow: now, bookingWindow: bookingWindow(now),reminders:{bookingDates,unreadCount:state.notifications.filter(x=>x.userId===actorId&&!x.readAt).length} };
      }
      if(action==='notification.mine')return state.notifications.filter(x=>x.userId===actorId).sort((a,b)=>b.createdAt-a.createdAt).map(x=>({...x}));
      if(action==='notification.read'){
        const notice=state.notifications.find(x=>x.id===input.id&&x.userId===actorId);
        if(!notice)fail('NOT_FOUND','通知不存在',404);notice.readAt=notice.readAt||now;return {...notice};
      }
      if(action==='notification.readReservation'){
        const row=findReservation();if(row.userId!==actorId)fail('FORBIDDEN','只能阅读本人的预约通知',403);
        let readCount=0;for(const notice of state.notifications)if(notice.userId===actorId&&notice.reservationId===row.id&&!notice.readAt){notice.readAt=now;readCount++;}
        return {readCount};
      }
      if(action==='profile.updateAvatar'){
        // 归属来自登录会话；不接收姓名、身份、权限或其他用户ID的修改。
        user.avatarUrl=avatar(input.avatarUrl);user.avatarUpdatedAt=now;
        audit(user.id,'profile.updateAvatar');
        return publicUser(user);
      }
      // 已登录但未核验的用户也可以反馈使用问题；归属只取可信会话。
      if (action === 'feedback.mine') return state.feedback.filter(x => x.userId === actorId).sort((a,b)=>b.createdAt-a.createdAt).map(feedbackView);
      if (action === 'feedback.submit') {
        const category = text(input.category, '反馈类型', 30);
        if (!Object.hasOwn(feedbackCategories, category)) fail('VALIDATION', '请选择有效的反馈类型');
        const content = text(input.content, '反馈内容', 1000);
        const requestId = text(input.requestId, '请求标识', 100, 8);
        const fingerprint = hash(JSON.stringify({ category, content }));
        const previous = state.feedback.find(x => x.userId === actorId && x.requestId === requestId);
        if (previous) {
          if (previous.fingerprint !== fingerprint) fail('IDEMPOTENCY_MISMATCH', '同一请求标识不能用于不同反馈内容', 409);
          return { ...feedbackView(previous), replayed: true };
        }
        const row = { id: randomUUID(), userId: actorId, category, content, requestId, fingerprint, status: 'pending', createdAt: now };
        state.feedback.push(row);
        audit(row.id, 'feedback.submit');
        return feedbackView(row);
      }
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
      const blockView=block=>({...block,createdByName:state.users.find(x=>x.id===block.createdBy)?.name||'负责人',releasedByName:state.users.find(x=>x.id===block.releasedBy)?.name||'',canRelease:liveBlock(block,now),statusText:block.status==='released'?'已解除':block.endAt<=now?'已结束':block.startAt>now?'已安排':'停用中'});
      if(action==='admin.rooms')return {serverNow:now,bookingWindow:bookingWindow(now),rooms:state.rooms.map(room=>({...room,blocks:state.blocks.filter(x=>x.roomId===room.id).sort((a,b)=>b.createdAt-a.createdAt).map(blockView)}))};
      if(action==='admin.roomBlockPreview'||action==='admin.roomBlockCreate'){
        const room=state.rooms.find(x=>x.id===input.roomId);if(!room)fail('NOT_FOUND','会议室不存在',404);
        const requestId=action==='admin.roomBlockCreate'?text(input.requestId,'请求标识',100,8):null;
        const previous=requestId&&state.blocks.find(x=>x.requestId===requestId&&x.createdBy===actorId);
        const time=blockRange(input,previous?-Infinity:now),reason=text(input.reason,'停用原因',200);
        const fingerprint=hash(JSON.stringify({roomId:room.id,...time,reason}));
        if(previous){if(previous.fingerprint!==fingerprint)fail('IDEMPOTENCY_MISMATCH','同一请求标识不能用于不同停用安排',409);return {...blockView(previous),replayed:true};}
        if(state.blocks.some(x=>liveBlock(x,now)&&x.roomId===room.id&&time.startAt<x.endAt&&time.endAt>x.startAt))fail('CONFLICT','该区间已有停用安排，请先查看现有记录',409);
        const affected=state.reservations.filter(x=>active(x)&&x.roomId===room.id&&time.startAt<x.endAt&&time.endAt>x.startAt).sort((a,b)=>a.id.localeCompare(b.id));
        const previewVersion=hash(JSON.stringify({fingerprint,affected:affected.map(x=>[x.id,x.status,x.startAt,x.endAt])}));
        if(action==='admin.roomBlockPreview')return {previewVersion,roomId:room.id,...time,reason,affected:affected.map(view)};
        if(input.previewVersion!==previewVersion)fail('PREVIEW_CHANGED','预约情况已变化，请重新预览并确认停用',409);
        const block={id:randomUUID(),roomId:room.id,...time,reason,requestId,fingerprint,status:'active',createdBy:actorId,createdAt:now,cancelledCount:affected.length};
        for(const row of affected){
          Object.assign(row,{status:'cancelled',cancelledBy:actorId,cancelledAt:now,reason,cancellationType:'room-block',blockId:block.id});
          state.notifications.push({id:randomUUID(),userId:row.userId,reservationId:row.id,type:'room-block-cancelled',content:row.roomId+'会议室 '+row.date+' '+row.start+'—'+row.end+' 的预约因会议室停用已取消。原因：'+reason,createdAt:now,readAt:null});
          audit(row.id,'reservation.roomBlockCancel',reason);
        }
        state.blocks.push(block);audit(block.id,'room.block.create',reason);return blockView(block);
      }
      if(action==='admin.roomBlockRelease'){
        const block=state.blocks.find(x=>x.id===input.id);if(!block)fail('NOT_FOUND','停用安排不存在',404);
        if(!liveBlock(block,now))fail('STATE','该停用已结束或解除，请刷新',409);
        const reason=text(input.reason,'恢复原因',200);
        Object.assign(block,{status:'released',releasedAt:now,releasedBy:actorId,releaseReason:reason});audit(block.id,'room.block.release',reason);return blockView(block);
      }
      if (action === 'rooms.list' || action === 'rooms.detail') {
        const day = date(input.date);
        const selected = action === 'rooms.detail' ? state.rooms.filter(x => x.id === input.roomId) : state.rooms;
        if (!selected.length) fail('NOT_FOUND', '会议室不存在', 404);
        const dayStart=Date.parse(day+'T08:00:00+08:00'),dayEnd=Date.parse(day+'T22:00:00+08:00');
        const hhmm=at=>new Date(at+8*3600000).toISOString().slice(11,16);
        const result = selected.map(room => ({ ...room, occupied: [
          ...state.reservations.filter(x => x.roomId === room.id && x.date === day && active(x)).map(x => ({ start: x.start, end: x.end, label: '已占用' })),
          ...state.blocks.filter(x=>liveBlock(x,now)&&x.roomId===room.id&&x.startAt<dayEnd&&x.endAt>dayStart).map(x=>({start:hhmm(Math.max(dayStart,x.startAt)),end:hhmm(Math.min(dayEnd,x.endAt)),label:'停用'}))
        ].sort((a,b)=>a.start.localeCompare(b.start)) }));
        return action === 'rooms.detail' ? result[0] : result;
      }
      if (action === 'reservation.create') {
        const requestKey = text(input.requestId, '请求标识', 100, 8);
        // 只对业务字段计算摘要，客户端角色/最终状态等不参与权威决策。
        const payload = { roomId: input.roomId, date: input.date, start: input.start, end: input.end, purpose: input.purpose, responsibleTeacher: input.responsibleTeacher, borrowerName: input.borrowerName, attendees: input.attendees, phone: input.phone, notes: input.notes || '' };
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
        const row = { id: randomUUID(), userId: actorId, roomId: room.id, ...time, responsibleTeacher: text(input.responsibleTeacher, '负责老师', 50), borrowerName: text(input.borrowerName, '借用人', 50), purpose: text(input.purpose, '用途', 200), attendees: input.attendees, phone: phone(input.phone), notes: text(input.notes || '', '备注', 500, 0), applicantName: user.name, studentNo: user.studentNo, identityType: user.identityType, status: user.identityType === 'teacher' ? 'approved' : 'pending', createdAt: now };
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
        if (!active(row)) fail('STATE', '仅能取消待确认或预约成功的有效预约', 409);
        if (row.startAt - now < CANCELLATION_LEAD) fail('CANCELLATION_CUTOFF', '须至少提前5小时取消预约；距会议开始不足5小时，请联系曹闯老师处理，QQ：28061535', 409);
        Object.assign(row, { status: 'cancelled', cancelledBy: actorId, cancelledAt: now, reason: '本人取消' });
        audit(row.id, 'reservation.cancel');
        return view(row);
      }
      if (action === 'admin.cancelReservation') {
        const row = findReservation();
        if (!active(row)) fail('STATE', '该预约已结束或已处理，不能重复取消', 409);
        const reason=text(input.reason,'取消原因',200);
        Object.assign(row,{status:'cancelled',cancelledBy:actorId,cancelledAt:now,reason,cancellationType:'admin'});
        state.notifications.push({id:randomUUID(),userId:row.userId,reservationId:row.id,type:'admin-cancelled',content:row.roomId+'会议室 '+row.date+' '+row.start+'—'+row.end+' 的预约已由管理员取消。原因：'+reason,createdAt:now,readAt:null});
        audit(row.id,'admin.cancelReservation',reason);
        return view(row);
      }
      if (action === 'admin.dashboard') return { reservations: state.reservations.filter(x=>x.status==='pending').length, identities: state.identities.filter(x=>x.status==='pending').length, feedback: state.feedback.filter(x=>x.status==='pending').length, total: state.reservations.length };
      if (action === 'admin.feedback') {
        if (input.status && !['pending', 'replied'].includes(input.status)) fail('VALIDATION', '反馈状态无效');
        return state.feedback.filter(x => !input.status || x.status === input.status).sort((a,b)=>b.createdAt-a.createdAt).map(row => ({ ...feedbackView(row), applicantName: state.users.find(x=>x.id===row.userId).name || '未填写姓名', repliedBy: row.repliedBy || null }));
      }
      if (action === 'admin.replyFeedback') {
        const row = state.feedback.find(x => x.id === input.id);
        if (!row) fail('NOT_FOUND', '反馈记录不存在', 404);
        if (row.status !== 'pending') fail('STATE', '该反馈已回复，请刷新查看', 409);
        const reply = text(input.reply, '回复内容', 1000);
        Object.assign(row, { status: 'replied', reply, repliedBy: actorId, repliedAt: now });
        audit(row.id, 'feedback.reply');
        return feedbackView(row);
      }
      if (action === 'admin.reservations') {
        if (input.date) date(input.date);
        return state.reservations.filter(x => (!input.roomId || x.roomId === input.roomId) && (!input.date || x.date === input.date) && (!input.status || x.status === input.status) && (!input.applicant || [x.applicantName,x.studentNo,x.borrowerName,x.responsibleTeacher].some(value=>(value||'').includes(input.applicant)))).sort((a,b)=>b.createdAt-a.createdAt).map(view);
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
          interval(row, now);
          capacity(state.rooms.find(x=>x.id===row.roomId), row.attendees);
          conflict(state, row, row.id);
        }
        Object.assign(row, { status: input.decision === 'approve' ? 'approved' : 'rejected', reviewedBy: actorId, reviewedAt: now, reason });
        notifyReservation(row,'reservation-'+row.status,row.status==='approved'?'的申请已审核通过，预约成功。请在预约详情查看会议室密码。':'的申请未通过审核。原因：'+reason);
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
  // 仅由本地HTTP登录适配器调用；云端仍使用微信可信上下文，不暴露测试会话入口。
  async function issueSession(userId) {
    const token=randomBytes(32).toString('hex');
    await db.transact(state=>{
      if(!state.users.some(x=>x.id===userId))fail('UNAUTHENTICATED','测试用户不存在',401);
      state.sessions.push({id:hash(token),userId,expiresAt:clock()+12*3600000});
    });
    return token;
  }
  async function resolveSession(token) {
    if(!/^[a-f0-9]{64}$/.test(token||''))return null;
    return db.transact(state=>{const session=state.sessions.find(x=>x.id===hash(token));return session&&session.expiresAt>clock()?session.userId:null;});
  }
  return { execute, issueSession, resolveSession };
}
module.exports = { createService, BusinessError, effective, interval, date, labels, bookingWindow };
