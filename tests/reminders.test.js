const {test}=require('node:test'),assert=require('node:assert/strict');
const {openDatabase}=require('../server/db'),{seed}=require('../server/seed'),{createService}=require('../server/service');
async function fixture(run){const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});let now=Date.parse('2035-01-01T07:00:00+08:00'),sequence=0;const service=createService(db,{clock:()=>now}),call=(user,action,payload={})=>service.execute('demo-'+user,action,payload),book=(user,extra={})=>call(user,'reservation.create',{roomId:'7081',date:'2035-01-02',start:'14:00',end:'15:00',responsibleTeacher:'测试老师',borrowerName:'测试借用人',purpose:'提醒测试',attendees:2,phone:'13800000001',requestId:'reminder-'+(++sequence),...extra});try{await run({db,call,book,setNow:value=>{now=value;},service});}finally{await db.close();}}

test('日历预约标记只统计本人有效记录，拒绝和取消后移除',()=>fixture(async({call,book})=>{
 const first=await book('student'),second=await book('student',{roomId:'7091'});await book('teacher',{date:'2035-01-03'});
 assert.deepEqual((await call('student','me')).reminders.bookingDates,{'2035-01-02':2});assert.deepEqual((await call('teacher','me')).reminders.bookingDates,{'2035-01-03':1});
 await call('admin','admin.reviewReservation',{id:first.id,decision:'reject',reason:'材料不全'});assert.deepEqual((await call('student','me')).reminders.bookingDates,{'2035-01-02':1});
 await call('admin','admin.reviewReservation',{id:second.id,decision:'approve'});assert.deepEqual((await call('student','me')).reminders.bookingDates,{'2035-01-02':1});await call('student','reservation.cancel',{id:second.id});assert.deepEqual((await call('student','me')).reminders.bookingDates,{});
}));

test('审核结果通知仅本人可读，重复审核不重复通知，已读跨服务保持',()=>fixture(async({db,call,book})=>{
 const row=await book('student');await call('admin','admin.reviewReservation',{id:row.id,decision:'approve'});await assert.rejects(call('admin','admin.reviewReservation',{id:row.id,decision:'approve'}),e=>e.code==='STATE');
 const notices=await call('student','notification.mine');assert.equal(notices.length,1);assert.equal(notices[0].type,'reservation-approved');assert.match(notices[0].content,/审核通过/);assert.equal((await call('student','me')).reminders.unreadCount,1);assert.equal((await call('teacher','me')).reminders.unreadCount,0);
 for(const user of ['teacher','admin'])await assert.rejects(call(user,'notification.readReservation',{id:row.id}),e=>e.code==='FORBIDDEN');
 assert.equal((await call('student','notification.readReservation',{id:row.id})).readCount,1);assert.equal((await call('student','notification.readReservation',{id:row.id})).readCount,0);
 assert.equal((await createService(db).execute('demo-student','me')).reminders.unreadCount,0);assert.ok((await call('student','notification.mine'))[0].readAt);
}));

test('拒绝原因进入本人消息，待审核开始失效只通知一次且移除日历标记',()=>fixture(async({call,book,setNow})=>{
 const rejected=await book('student');await call('admin','admin.reviewReservation',{id:rejected.id,decision:'reject',reason:'学院活动占用'});assert.match((await call('student','notification.mine'))[0].content,/学院活动占用/);
 const pending=await book('student');setNow(pending.startAt);const me=await call('student','me');assert.deepEqual(me.reminders.bookingDates,{});assert.equal(me.reminders.unreadCount,2);
 await call('student','me');assert.equal((await call('student','notification.mine')).filter(x=>x.reservationId===pending.id).length,1);
}));

test('管理员待办随提交增加、随处理减少，普通用户不能读取',()=>fixture(async({call,book})=>{
 const row=await book('student');assert.equal((await call('admin','admin.dashboard')).reservations,1);await assert.rejects(call('student','admin.dashboard'),e=>e.code==='FORBIDDEN');
 await call('admin','admin.reviewReservation',{id:row.id,decision:'approve'});assert.equal((await call('admin','admin.dashboard')).reservations,0);
}));

test('首页每30秒仅刷新提醒，离开后停止且忽略进行中的旧响应',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');const file=path.resolve('miniprogram/pages/home/index.js'),localRequire=createRequire(file);let page,tick,cleared=0,unread=0,resolveMe;const calls=[];
 const api={me:async()=>resolveMe?new Promise(resolve=>{resolveMe.resolve=resolve;}):{user:{id:'demo-student',verification:'approved',isAdmin:false},bookingWindow:{first:'2035-01-01',last:'2035-01-07'},reminders:{bookingDates:{'2035-01-02':1},unreadCount:unread}},call:async action=>{calls.push(action);return [];},error:()=>{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:definition=>{page=definition;},require:name=>name==='../../utils/api'?api:localRequire(name),wx:{getWindowInfo:()=>({statusBarHeight:24})},setInterval:(callback,delay)=>{assert.equal(delay,30000);tick=callback;return 1;},clearInterval:()=>{cleared++;},Date,JSON});
 page.data=structuredClone(page.data);page.setData=values=>Object.assign(page.data,values);await page.onShow();assert.equal(calls.length,1);unread=2;await tick();assert.equal(page.data.unreadCount,2);assert.equal(calls.length,1,'轻量刷新不重新读取房间列表');
 resolveMe={};const pending=tick();await new Promise(setImmediate);page.onHide();resolveMe.resolve({user:{id:'demo-student'},reminders:{bookingDates:{},unreadCount:9}});await pending;assert.equal(page.data.unreadCount,2);assert.ok(cleared>0);await tick();assert.equal(page.data.unreadCount,2);
});
