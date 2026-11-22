const {test}=require('node:test');
const assert=require('node:assert/strict');
const {interval,bookingWindow,createService}=require('../server/service');
const {openDatabase}=require('../server/db');
const {seed,rooms}=require('../server/seed');
const dates=require('../miniprogram/utils/date');
const settings=require('../design/room-settings.json');
const now=Date.parse('2030-06-01T07:00:00+08:00');
const input=(date)=>({date,start:'09:15',end:'11:45'});
test('含今天共7天：22号可选至28号，29号服务端拒绝',()=>{
  assert.equal(interval(input('2030-06-01'),now).date,'2030-06-01');
  assert.equal(interval(input('2030-06-07'),now).date,'2030-06-07');
  assert.throws(()=>interval(input('2030-06-08'),now),e=>e.code==='BOOKING_WINDOW'&&e.message.includes('曹闯老师')&&e.message.includes('28061535'));
  const nov22=Date.parse('2026-11-22T07:00:00+08:00');
  assert.equal(interval(input('2026-11-28'),nov22).date,'2026-11-28');
  assert.throws(()=>interval(input('2026-11-29'),nov22),e=>e.code==='BOOKING_WINDOW');
});
test('预约窗口采用北京时间自然日，跨月跨年正确',()=>{
  assert.equal(bookingWindow(Date.parse('2030-12-28T12:00:00+08:00')).last,'2031-01-03');
  const last=bookingWindow(Date.parse('2030-06-01T15:59:59.999Z'));
  const next=bookingWindow(Date.parse('2030-06-01T16:00:00Z'));
  assert.equal(last.first,'2030-06-01');assert.equal(next.first,'2030-06-02');assert.equal(next.last,'2030-06-08');
});
test('日期选项无年份滚轮，月日星期对应正确且覆盖跨年',()=>{
  const options=dates.options('2030-12-28');assert.equal(options.length,7);assert.equal(options[6].date,'2031-01-03');
  assert.equal(dates.label('2026-11-23'),'11月23日 星期一');
  assert.ok(options.every(x=>!x.label.includes('2030')&&!x.label.includes('2031')));
  const days=dates.calendar(2030,12,'2030-12-28','2030-12-28');assert.equal(days.find(x=>x.date==='2030-12-27').disabled,true);assert.equal(days.find(x=>x.date==='2030-12-28').disabled,false);
});
test('房间固定容量设备与解压原型文字一致',()=>{
  assert.deepEqual(rooms.map(x=>({id:x.id,capacity:x.capacity,equipment:x.equipment})),settings.rooms.map(x=>({id:x.id,capacity:x.capacity,equipment:x.equipment})));
  assert.ok(rooms.every(x=>x.capacity>0&&!x.equipment.includes('待核实')));
});
test('新规则不允许学生、教师或管理员通过伪造参数越过7天',async()=>{
  const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});const api=createService(db,{clock:()=>now});
  try{
    for(const user of ['demo-student','demo-teacher','demo-admin'])await assert.rejects(api.execute(user,'reservation.create',{...input('2030-06-09'),roomId:'7081',purpose:'边界测试',responsibleTeacher:'测试负责老师',borrowerName:'测试借用人',attendees:2,phone:'13800000001',requestId:'window-'+user,role:'admin',maxAdvanceDays:999}),e=>e.code==='BOOKING_WINDOW');
    const me=await api.execute('demo-student','me');assert.equal(me.bookingWindow.last,'2030-06-07');assert.equal(me.bookingWindow.days,7);assert.deepEqual(me.bookingWindow.manager,{name:'曹闯老师',qq:'28061535'});
  }finally{await db.close();}
});
test('已有数据库升级房间资料且保留预约，重复初始化不重置业务',async()=>{
  const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});const api=createService(db,{clock:()=>now});
  try{
    const row=await api.execute('demo-student','reservation.create',{...input('2030-06-01'),roomId:'7081',purpose:'保留历史',responsibleTeacher:'测试负责老师',borrowerName:'测试借用人',attendees:8,phone:'13800000001',requestId:'preserve-old-booking'});
    await db.transact(s=>{for(const room of s.rooms){room.capacity=null;room.equipment='待核实';delete room.settingsVersion;}});
    await seed(db);await seed(db);
    const list=await api.execute('demo-student','rooms.list',{date:'2030-06-01'});
    assert.ok(list.every(x=>x.capacity>0&&x.equipment!=='待核实'));assert.equal((await api.execute('demo-student','reservation.detail',{id:row.id})).purpose,'保留历史');
  }finally{await db.close();}
});
