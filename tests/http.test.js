const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openDatabase}=require('../server/db');
const {seed}=require('../server/seed');
const {createService}=require('../server/service');
const {createHttpServer}=require('../server/http');
test('真实 HTTP + PostgreSQL：登录、会话权限、读房间、提交预约和管理员批准',async()=>{
  const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});
  const server=createHttpServer(createService(db),{devLogin:true,driver:db.driver});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body,token)=>{const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(token||'')},body:JSON.stringify(body)});return {status:response.status,...await response.json()};};
  try{
    assert.equal((await (await fetch(base+'/health')).json()).database,'pglite');
    assert.equal((await post('/api',{action:'me',userId:'demo-admin'})).status,401);
    assert.equal((await post('/dev/login',null)).status,400);
    const student=(await post('/dev/login',{account:'demo-student'})).data.token;
    const admin=(await post('/dev/login',{account:'demo-admin'})).data.token;
    assert.equal((await post('/api',{action:'admin.dashboard',payload:{isAdmin:true}},student)).status,403);
    assert.equal((await post('/api',{action:'rooms.list',payload:{date:'2035-01-02'}},student)).data.length,5);
    const payload={roomId:'7081',date:'2035-01-02',start:'14:30',end:'17:50',purpose:'HTTP 集成测试',attendees:5,phone:'13800000001',requestId:'http-test-request'};
    const a=await post('/api',{action:'reservation.create',payload},student);assert.equal(a.data.status,'pending');
    const b=await post('/api',{action:'admin.reviewReservation',payload:{id:a.data.id,decision:'approve'}},admin);assert.equal(b.data.status,'approved');
    const mine=await post('/api',{action:'reservation.mine'},student);assert.equal(mine.data.length,1);
    assert.equal((await post('/api',{action:'reservation.create',payload},student)).data.id,a.data.id);
  }finally{await new Promise(r=>server.close(r));await db.close();}
});
test('开发登录关闭后无法使用测试账号',async()=>{const server=createHttpServer({execute(){throw Error('不应到达');}},{devLogin:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/dev/login',{method:'POST',body:JSON.stringify({account:'demo-admin'})});assert.equal(r.status,403);}finally{await new Promise(r=>server.close(r));}});
