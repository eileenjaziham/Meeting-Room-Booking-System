const {test}=require('node:test'),assert=require('node:assert/strict');
const {networkOptions,clientAddress}=require('../server/dev-network'),{createHttpServer}=require('../server/http');
test('默认仍仅允许本机测试登录，局域网需显式选择模式',()=>{
 assert.equal(networkOptions({}).host,'127.0.0.1');assert.throws(()=>networkOptions({HOST:'10.218.188.230'}),/start:lan/);
 const options=networkOptions({HOST:'10.218.188.230',ALLOW_LAN_DEV_LOGIN:'true',LAN_CLIENT_IPS:'10.218.188.89'});assert.equal(options.devLogin,true);assert.ok(options.allowedClients.includes('10.218.188.89'));assert.equal(clientAddress('::ffff:10.218.188.89'),'10.218.188.89');
});
test('局域网模式拒绝公网地址、全网监听及未配置的手机地址',()=>{
 for(const host of ['0.0.0.0','8.8.8.8','::','localhost'])assert.throws(()=>networkOptions({HOST:host,ALLOW_LAN_DEV_LOGIN:'true',LAN_CLIENT_IPS:'192.168.1.1'}));
 for(const clients of ['', '8.8.8.8', '192.168.1.1,1.1.1.1'])assert.throws(()=>networkOptions({HOST:'192.168.1.10',ALLOW_LAN_DEV_LOGIN:'true',LAN_CLIENT_IPS:clients}));
});
test('允许列表在登录前校验，允许设备仍需会话和业务权限',async()=>{
 const server=createHttpServer({issueSession:async()=> 'test-token',resolveSession:async()=>null},{devLogin:true,allowedClients:['10.1.2.3']});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 try{let response=await fetch(url+'/dev/login',{method:'POST',body:JSON.stringify({account:'demo-admin'})});assert.equal(response.status,403);assert.equal((await response.json()).error.message,'此设备未加入局域网调试允许列表');}
 finally{await new Promise(resolve=>server.close(resolve));}
 const allowed=createHttpServer({issueSession:async()=> 'test-token',resolveSession:async()=>null},{devLogin:true,allowedClients:['127.0.0.1']});await new Promise(resolve=>allowed.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+allowed.address().port;
 try{assert.equal((await fetch(base+'/dev/login',{method:'POST',body:JSON.stringify({account:'demo-student'})})).status,200);assert.equal((await fetch(base+'/api',{method:'POST',body:JSON.stringify({action:'admin.dashboard'})})).status,401);}
 finally{await new Promise(resolve=>allowed.close(resolve));}
});
