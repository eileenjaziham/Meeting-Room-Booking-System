// 测试微信 Page 事件代码；wx.request 走真实 HTTP + PGlite，仅模拟微信宿主 API。
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {createRequire}=require('node:module');
const {openDatabase}=require('../server/db');const {seed}=require('../server/seed');const {createService}=require('../server/service');const {createHttpServer}=require('../server/http');
test('原生 Page 事件连接真实接口：学生提交、管理员批准、本人取消、教师直约、身份核验',async()=>{
 const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});const server=createHttpServer(createService(db),{devLogin:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;const storage=new Map(),pending=new Set(),navigation=[];const app={globalData:{user:null}};
 global.getApp=()=>app;global.wx={
 getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,v),removeStorageSync:k=>storage.delete(k),
 getWindowInfo:()=>({statusBarHeight:24}),showToast:()=>{},stopPullDownRefresh:()=>{},showModal:async()=>({confirm:true}),
 navigateTo:v=>navigation.push(v.url),redirectTo:v=>navigation.push(v.url),switchTab:v=>navigation.push(v.url),
 request(options){const task=fetch(base+new URL(options.url).pathname,{method:options.method,headers:{...options.header,'Content-Type':'application/json'},body:JSON.stringify(options.data)}).then(async r=>options.success({statusCode:r.status,data:await r.json()})).catch(()=>options.fail()).finally(()=>pending.delete(task));pending.add(task);}
 };
 const idle=async()=>{do{await Promise.all([...pending]);await new Promise(setImmediate);}while(pending.size);};
 function page(name){const file=path.resolve('miniprogram/pages/'+name+'/index.js');let definition;vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:d=>{definition=d;},require:createRequire(file),wx:global.wx,getApp:global.getApp,Date,Math,console},{filename:file});const instance={...definition,data:structuredClone(definition.data||{}),setData(values){Object.assign(this.data,values);}};for(const [k,v]of Object.entries(definition))if(typeof v==='function')instance[k]=v.bind(instance);return instance;}
 const api=require('../miniprogram/utils/api');
 try{
  const login=page('login');await login.login({currentTarget:{dataset:{account:'demo-student'}}});assert.equal(app.globalData.user.identityType,'student');
  const home=page('home');home.onLoad();home.setData({date:'2035-01-02'});home.setMonth(home.data.date);await home.load();assert.equal(home.data.rooms.length,5);
  home.openRoom({currentTarget:{dataset:{id:'7081'}}});assert.match(navigation.at(-1),/date=2035-01-02/);
  const room=page('room');room.onLoad({id:'7081',date:'2035-01-02'});await room.load();room.changeTime({currentTarget:{dataset:{field:'start'}},detail:{value:'14:30'}});room.changeTime({currentTarget:{dataset:{field:'end'}},detail:{value:'17:50'}});room.next();assert.match(navigation.at(-1),/start=14:30&end=17:50/);
  const booking=page('booking');booking.setData({roomId:'7081',date:'2035-01-02',start:'14:30',end:'17:50'});await booking.load();booking.field({currentTarget:{dataset:{field:'purpose'}},detail:{value:'页面联调研讨'}});booking.field({currentTarget:{dataset:{field:'attendees'}},detail:{value:'8'}});await booking.submit();assert.equal(booking.data.error,'');assert.match(navigation.at(-1),/pages\/result/);
  const id=navigation.at(-1).split('id=')[1];const result=page('result');result.id=id;await result.load();assert.equal(result.data.record.status,'pending');
  assert.equal((await api.call('rooms.detail',{roomId:'7081',date:'2035-01-02'})).occupied[0].end,'17:50');
  home.selectDate({currentTarget:{dataset:{date:'2035-01-03'}}});await idle();assert.equal(home.data.rooms.find(x=>x.id==='7081').occupied.length,0);
  await api.login('demo-admin');const admin=page('admin');await admin.load();assert.equal(admin.data.stats.reservations,1);
  const ledger=page('admin-records');ledger.onLoad({status:'pending'});await ledger.load();assert.equal(ledger.data.records[0].id,id);
  const detail=page('reservation');detail.onLoad({id,admin:'1'});await detail.load();await detail.review({currentTarget:{dataset:{decision:'approve'}}});assert.equal(detail.data.record.status,'approved');
  await api.login('demo-student');const mine=page('reservations');await mine.load();assert.equal(mine.data.records[0].status,'approved');
  const owner=page('reservation');owner.onLoad({id});await owner.load();assert.equal(owner.data.record.canCancel,true);await owner.cancel();assert.equal(owner.data.record.status,'cancelled');
  assert.equal((await api.call('rooms.detail',{roomId:'7081',date:'2035-01-02'})).occupied.length,0);
  await api.login('demo-teacher');const teacher=page('booking');teacher.setData({roomId:'7091',date:'2035-01-02',start:'09:15',end:'11:45',purpose:'教师会议',attendees:'5'});await teacher.load();await teacher.submit();const teacherId=navigation.at(-1).split('id=')[1];assert.equal((await api.call('reservation.detail',{id:teacherId})).status,'approved');
  await api.login('demo-guest');const identity=page('identity');await identity.load();identity.setData({name:'虚构联调教师',studentNo:'DEMO-PAGE-T',phone:'13800000008',typeIndex:1});await identity.submit();assert.equal(identity.data.user.verification,'pending');assert.equal(identity.data.user.identityType,null);
  await api.login('demo-admin');const reviews=page('admin-identities');await reviews.load();reviews.select({currentTarget:{dataset:{id:reviews.data.records[0].id}}});await reviews.review({currentTarget:{dataset:{decision:'approve'}}});assert.equal(reviews.data.records.length,0);
  await api.login('demo-guest');assert.equal(app.globalData.user.identityType,'teacher');assert.equal(app.globalData.user.isAdmin,false);
 }finally{await idle();delete global.wx;delete global.getApp;await new Promise(r=>server.close(r));await db.close();}
});
