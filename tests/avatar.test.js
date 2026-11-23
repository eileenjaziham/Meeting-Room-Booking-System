const {test}=require('node:test');const assert=require('node:assert/strict');
const {openDatabase}=require('../server/db');const {seed}=require('../server/seed');const {createService}=require('../server/service');const {createHttpServer}=require('../server/http');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=';
function largePng(){
 const {randomBytes}=require('node:crypto'),{deflateSync}=require('node:zlib');
 function chunk(type,data){const name=Buffer.from(type),body=Buffer.concat([name,data]),size=Buffer.alloc(4),checksum=Buffer.alloc(4);let crc=0xffffffff;for(const value of body){crc^=value;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}size.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,body,checksum]);}
 const header=Buffer.alloc(13);header.writeUInt32BE(128,0);header.writeUInt32BE(96,4);header[8]=8;header[9]=6;
 const rows=Buffer.concat(Array.from({length:96},()=>Buffer.concat([Buffer.from([0]),randomBytes(128*4)])));
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
test('头像真实HTTP保存，服务重建后仍在；不能改姓名、角色或他人头像',async()=>{
 const db=await openDatabase({driver:'pglite',path:'memory://'});await seed(db,{demo:true});const service=createService(db),server=createHttpServer(service,{devLogin:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const post=async(path,body,token)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+path,{method:'POST',headers:{Authorization:'Bearer '+(token||'')},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
 try{
  const token=(await post('/dev/login',{account:'demo-student'})).data.token;
  const large=largePng();assert.ok(large.length>32768&&large.length<90000);
  assert.equal((await post('/api',{action:'profile.updateAvatar',payload:{avatarUrl:large}},token)).status,200);
  const saved=await post('/api',{action:'profile.updateAvatar',payload:{avatarUrl:png,userId:'demo-teacher',name:'改名',identityType:'teacher',isAdmin:true}},token);
  assert.equal(saved.status,200);assert.equal(saved.data.avatarUrl,png);assert.equal(saved.data.name,'测试学生甲');assert.equal(saved.data.identityType,'student');assert.equal(saved.data.isAdmin,false);
  const restarted=createService(db);assert.equal((await restarted.execute('demo-student','me')).user.avatarUrl,png);assert.equal((await restarted.execute('demo-teacher','me')).user.avatarUrl,undefined);
  assert.equal((await post('/api',{action:'profile.updateAvatar',payload:{avatarUrl:png}})).status,401);
  for(const avatarUrl of ['https://example.com/avatar.jpg','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YWJj','data:image/jpeg;base64,YWJj']){
   const invalid=await post('/api',{action:'profile.updateAvatar',payload:{avatarUrl}},token);assert.equal(invalid.status,400);assert.equal(invalid.error.code,'VALIDATION');
  }
  const tooLarge='data:image/png;base64,'+Buffer.alloc(65537).toString('base64');
  assert.equal((await post('/api',{action:'profile.updateAvatar',payload:{avatarUrl:tooLarge}},token)).status,413);
  assert.equal((await restarted.execute('demo-student','me')).user.avatarUrl,png);
  await assert.rejects(restarted.execute('demo-student','identity.submit',{name:'自行改名'}),e=>e.code==='STATE');
  const guest=await restarted.execute('demo-guest','profile.updateAvatar',{avatarUrl:png});assert.equal(guest.avatarUrl,png);assert.equal(guest.verification,'unsubmitted');
 }finally{await new Promise(r=>server.close(r));await db.close();}
});
test('头像取消或压缩失败不会覆盖原头像，账号切换后不上传旧账号图片',async()=>{
 const {change}=require('../miniprogram/utils/avatar');const old={id:'demo-student',name:'测试学生甲',avatarUrl:png};const app={globalData:{user:old}};
 global.getApp=()=>app;let uploads=0;
 global.wx={compressImage:options=>options.fail({errMsg:'compressImage:fail'}),getFileSystemManager:()=>({readFile:options=>options.success({data:png.split(',')[1]})}),getStorageSync:()=>'',reLaunch:()=>{uploads++;}};
 const page={data:{user:old,avatarBusy:false,error:''},setData(values){Object.assign(this.data,values);}};
 try{
  await change(page,{detail:{}});assert.equal(page.data.error,'');
  await change(page,{detail:{avatarUrl:'tmp.png'}});assert.equal(page.data.avatarBusy,false);assert.equal(page.data.user.avatarUrl,png);assert.match(page.data.error,/头像更新失败/);
  wx.compressImage=options=>{app.globalData.user={id:'demo-teacher'};options.success({tempFilePath:'compressed.png'});};
  await change(page,{detail:{avatarUrl:'tmp.png'}});assert.equal(uploads,0);assert.equal(page.data.user.id,'demo-student');assert.equal(page.data.avatarBusy,false);
 }finally{delete global.wx;delete global.getApp;}
});
