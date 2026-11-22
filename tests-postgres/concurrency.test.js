// 需专用测试数据库，禁止指向正式数据。每个连接池代表一个独立云函数实例。
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openDatabase}=require('../server/db');
const {seed}=require('../server/seed');
const {createService}=require('../server/service');
test('PostgreSQL 独立连接池之间抢约互斥',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const options={driver:'pg',url:process.env.TEST_DATABASE_URL};
 const first=await openDatabase(options);const second=await openDatabase(options);
 try{await seed(first,{demo:true});const clock=()=>Date.parse('2099-06-01T07:00:00+08:00');const a=createService(first,{clock});const b=createService(second,{clock});const day='2099-06-01';
 await first.transact(s=>{for(const r of s.reservations)if(r.date===day&&r.roomId==='7081'&&['pending','approved'].includes(r.status))r.status='cancelled';});
 const p={roomId:'7081',date:day,start:'14:30',end:'17:50',purpose:'跨连接并发测试',responsibleTeacher:'测试负责老师',borrowerName:'测试借用人',attendees:2,phone:'13800000001'};
 const result=await Promise.allSettled([a.execute('demo-student','reservation.create',{...p,requestId:'pg-a-'+Date.now()}),b.execute('demo-teacher','reservation.create',{...p,requestId:'pg-b-'+Date.now()})]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal(result.find(x=>x.status==='rejected').reason.code,'CONFLICT');
 }finally{await first.close();await second.close();}
});
