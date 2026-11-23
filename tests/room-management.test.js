const {test}=require('node:test');const assert=require('node:assert/strict');
const {openDatabase}=require('../server/db');const {seed}=require('../server/seed');const {createService}=require('../server/service');
async function fixture(run){const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});let now=Date.parse('2035-01-01T07:00:00+08:00');const service=createService(db,{clock:()=>now});let sequence=0;
 const call=(user,action,input={})=>service.execute('demo-'+user,action,input);
 const book=(user,extra={})=>call(user,'reservation.create',{roomId:'7081',date:'2035-01-02',start:'09:00',end:'10:00',responsibleTeacher:'测试老师',borrowerName:'测试借用人',purpose:'停用联调',attendees:3,phone:'13800000001',requestId:'room-book-'+(++sequence),...extra});
 const block={roomId:'7081',startDate:'2035-01-02',endDate:'2035-01-02',start:'09:30',end:'10:30',reason:'设备检修'};
 const preview=(extra={})=>call('admin','admin.roomBlockPreview',{...block,...extra});
 const create=(p,extra={})=>call('admin','admin.roomBlockCreate',{...block,previewVersion:p.previewVersion,requestId:'room-block-'+(++sequence),...extra});
 try{await run({db,service,call,book,block,preview,create,setNow:value=>{now=Date.parse(value);}});}finally{await db.close();}
}
test('停用预览、原子取消、本人通知、阻止重叠及解除后不恢复旧预约',()=>fixture(async({call,book,preview,create})=>{
 const student=await book('student'),teacher=await book('teacher',{start:'10:00',end:'11:00'}),unaffected=await book('student',{start:'11:00',end:'12:00'});
 const p=await preview();assert.equal(p.affected.length,2);const block=await create(p);assert.equal(block.cancelledCount,2);
 for(const [user,row]of [['student',student],['teacher',teacher]]){const detail=await call(user,'reservation.detail',{id:row.id});assert.equal(detail.status,'cancelled');assert.equal(detail.reason,'设备检修');assert.equal(detail.blockId,block.id);}
 assert.equal((await call('student','reservation.detail',{id:unaffected.id})).status,'pending');
 const notices=await call('student','notification.mine',{userId:'demo-teacher'});assert.equal(notices.length,1);assert.equal(notices[0].reservationId,student.id);assert.match(notices[0].content,/设备检修/);
 await assert.rejects(call('teacher','notification.read',{id:notices[0].id}),e=>e.code==='NOT_FOUND');await call('student','notification.read',{id:notices[0].id});assert.ok((await call('student','notification.mine'))[0].readAt);
 const occupancy=await call('teacher','rooms.detail',{roomId:'7081',date:'2035-01-02'});assert.ok(occupancy.occupied.some(x=>x.start==='09:30'&&x.end==='10:30'&&x.label==='停用'));assert.ok(occupancy.occupied.every(x=>Object.keys(x).length===3));
 await assert.rejects(book('teacher',{start:'10:00',end:'10:15'}),e=>e.code==='ROOM_UNAVAILABLE');await book('teacher',{start:'10:30',end:'10:45'});
 await assert.rejects(call('admin','admin.reviewReservation',{id:student.id,decision:'approve'}),e=>e.code==='STATE');
 const released=await call('admin','admin.roomBlockRelease',{id:block.id,reason:'检修完成'});assert.equal(released.status,'released');
 assert.equal((await call('student','reservation.detail',{id:student.id})).status,'cancelled');assert.equal((await book('teacher',{start:'09:30',end:'10:00'})).status,'approved');
 const rooms=await call('admin','admin.rooms');assert.equal(rooms.rooms.find(x=>x.id==='7081').blocks[0].releaseReason,'检修完成');
}));
test('预览后预约变化必须重新确认，不得静默取消新增预约',()=>fixture(async({db,book,preview,create})=>{
 const p=await preview(),row=await book('student');await assert.rejects(create(p),e=>e.code==='PREVIEW_CHANGED');
 const stored=await db.transact(s=>({blocks:s.blocks.length,notices:s.notifications.length,row:s.reservations.find(x=>x.id===row.id).status}));assert.deepEqual(stored,{blocks:0,notices:0,row:'pending'});
 const fresh=await preview();assert.notEqual(fresh.previewVersion,p.previewVersion);assert.equal((await create(fresh)).cancelledCount,1);
}));
test('停用与新预约并发，不得同时成功；停用重试不会重复取消或通知',()=>fixture(async({db,call,book,block,preview,create})=>{
 const p=await preview();const request={...block,requestId:'stable-block-request',previewVersion:p.previewVersion};
 const results=await Promise.allSettled([call('admin','admin.roomBlockCreate',request),book('teacher')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'ROOM_UNAVAILABLE');
 const replay=await call('admin','admin.roomBlockCreate',request);assert.equal(replay.replayed,true);assert.equal((await db.transact(s=>s.blocks.length)),1);
 await call('admin','admin.roomBlockRelease',{id:replay.id,reason:'恢复测试'});const releasedReplay=await call('admin','admin.roomBlockCreate',request);assert.equal(releasedReplay.status,'released');assert.equal((await db.transact(s=>s.notifications.length)),0);
}));
test('跨日停用按每日开放时间截取，已完成与失效历史保持不变',()=>fixture(async({call,book,preview,create,setNow})=>{
 const historical=await book('teacher',{date:'2035-01-01',start:'08:00',end:'09:00'});setNow('2035-01-01T10:00:00+08:00');
 const range={startDate:'2035-01-01',endDate:'2035-01-03',start:'08:00',end:'12:00'};const p=await preview(range);assert.equal(p.affected.length,0);await create(p,range);
 assert.equal((await call('teacher','reservation.detail',{id:historical.id})).status,'completed');
 for(const [day,start,end]of [['2035-01-01','08:00','22:00'],['2035-01-02','08:00','22:00'],['2035-01-03','08:00','12:00']]){const room=await call('student','rooms.detail',{roomId:'7081',date:day});assert.deepEqual(room.occupied,[{start,end,label:'停用'}]);}
}));
test('普通师生不能管理房间；原因、无效区间和重复停用均校验',()=>fixture(async({call,block,preview,create})=>{
 for(const action of ['admin.rooms','admin.roomBlockPreview','admin.roomBlockCreate','admin.roomBlockRelease'])for(const user of ['student','teacher'])await assert.rejects(call(user,action,block),e=>e.code==='FORBIDDEN');
 await assert.rejects(preview({reason:' '}),e=>e.code==='VALIDATION');await assert.rejects(preview({end:'09:00'}),e=>e.code==='TIME_RANGE');
 const record=await create(await preview());await assert.rejects(preview(),e=>e.code==='CONFLICT');await assert.rejects(call('admin','admin.roomBlockRelease',{id:record.id,reason:''}),e=>e.code==='VALIDATION');
 await call('admin','admin.roomBlockRelease',{id:record.id,reason:'恢复'});await assert.rejects(call('admin','admin.roomBlockRelease',{id:record.id,reason:'重复恢复'}),e=>e.code==='STATE');
}));
test('停用处理事务失败时，预约、停用和通知一起回滚',()=>fixture(async({db,book,preview,block,call})=>{
 const row=await book('student'),p=await preview();const failing=createService({transact:fn=>db.transact(async state=>{const result=await fn(state);if(state.blocks.length)throw Error('injected failure');return result;})},{clock:()=>Date.parse('2035-01-01T07:00:00+08:00')});
 await assert.rejects(failing.execute('demo-admin','admin.roomBlockCreate',{...block,previewVersion:p.previewVersion,requestId:'rollback-block-request'}),/injected failure/);
 assert.equal((await call('student','reservation.detail',{id:row.id})).status,'pending');assert.deepEqual(await db.transact(s=>[s.blocks.length,s.notifications.length]),[0,0]);
}));
