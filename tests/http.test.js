const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openDatabase}=require('../server/db');
const {seed}=require('../server/seed');
const {createService}=require('../server/service');
const {createHttpServer}=require('../server/http');
test('真实 HTTP + PostgreSQL：登录、会话权限、读房间、提交预约和管理员批准',async()=>{
  const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});
  const server=createHttpServer(createService(db,{clock:()=>Date.parse('2035-01-01T07:00:00+08:00')}),{devLogin:true,driver:db.driver});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body,token)=>{const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(token||'')},body:JSON.stringify(body)});return {status:response.status,...await response.json()};};
  try{
    assert.equal((await (await fetch(base+'/health')).json()).database,'pglite');
    assert.equal((await post('/api',{action:'me',userId:'demo-admin'})).status,401);
    assert.equal((await post('/dev/login',null)).status,400);
    const student=(await post('/dev/login',{account:'demo-student'})).data.token;
    const teacher=(await post('/dev/login',{account:'demo-teacher'})).data.token;
    const admin=(await post('/dev/login',{account:'demo-admin'})).data.token;
    assert.equal((await post('/api',{action:'admin.dashboard',payload:{isAdmin:true}},student)).status,403);
    assert.equal((await post('/api',{action:'rooms.list',payload:{date:'2035-01-02'}},student)).data.length,5);
    const payload={roomId:'7081',date:'2035-01-02',start:'14:30',end:'17:50',purpose:'HTTP 集成测试',responsibleTeacher:'测试负责老师',borrowerName:'测试借用人',attendees:5,phone:'13800000001',requestId:'http-test-request'};
    const a=await post('/api',{action:'reservation.create',payload},student);assert.equal(a.data.status,'pending');
    // 绕过页面直接请求：待确认也占用；同一段、包含、被包含、首尾一分钟重叠全部拒绝。
    for(const [index,[start,end]]of [['14:30','17:50'],['14:29','17:51'],['15:00','16:00'],['14:00','14:31'],['17:49','18:00']].entries()){
      const blocked=await post('/api',{action:'reservation.create',payload:{...payload,start,end,requestId:'http-overlap-'+index}},teacher);
      assert.equal(blocked.status,409);assert.equal(blocked.error.code,'CONFLICT');assert.match(blocked.error.message,/14:30—17:50/);
    }
    const b=await post('/api',{action:'admin.reviewReservation',payload:{id:a.data.id,decision:'approve'}},admin);assert.equal(b.data.status,'approved');
    const race=await Promise.all(Array.from({length:8},(_,i)=>post('/api',{action:'reservation.create',payload:{...payload,start:'17:49',end:'18:00',requestId:'http-race-'+i}},i%2?student:teacher)));
    assert.ok(race.every(result=>result.status===409&&result.error.code==='CONFLICT'));
    assert.equal((await post('/api',{action:'admin.reservations',payload:{roomId:'7081',date:payload.date}},admin)).data.length,1);
    const mine=await post('/api',{action:'reservation.mine'},student);assert.equal(mine.data.length,1);
    assert.equal((await post('/api',{action:'reservation.create',payload},student)).data.id,a.data.id);
  }finally{await new Promise(r=>server.close(r));await db.close();}
});
test('开发登录关闭后无法使用测试账号',async()=>{const server=createHttpServer({execute(){throw Error('不应到达');}},{devLogin:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/dev/login',{method:'POST',body:JSON.stringify({account:'demo-admin'})});assert.equal(r.status,403);}finally{await new Promise(r=>server.close(r));}});
test('HTTP服务重建后登录保持有效，令牌仅存哈希，12小时到期后拒绝',async()=>{
 const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});let now=Date.parse('2035-01-01T07:00:00+08:00');let server;
 const start=async()=>{server=createHttpServer(createService(db,{clock:()=>now}),{devLogin:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
 try{
  let base=await start();const login=await fetch(base+'/dev/login',{method:'POST',body:JSON.stringify({account:'demo-student'})}).then(r=>r.json());const token=login.data.token;
  const stored=await db.transact(s=>s.sessions[0]);assert.notEqual(stored.id,token);assert.equal(stored.userId,'demo-student');
  await new Promise(r=>server.close(r));base=await start();
  const me=await fetch(base+'/api',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({action:'me'})});assert.equal(me.status,200);assert.equal((await me.json()).data.user.id,'demo-student');
  now+=12*3600000;const expired=await fetch(base+'/api',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({action:'me'})});assert.equal(expired.status,401);
 }finally{if(server.listening)await new Promise(r=>server.close(r));await db.close();}
});
