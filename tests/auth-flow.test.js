const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');
function apiEnvironment(token,route='pages/booking/index') {
 const storage=new Map(token?[['token',token]]:[]),navigation=[],requests=[];const app={globalData:{user:{id:'demo-student'}}};
 const wx={getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,v),removeStorageSync:k=>storage.delete(k),reLaunch:o=>navigation.push(o.url),request:o=>requests.push(o)};
 const file=path.resolve('miniprogram/utils/api.js');const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:createRequire(file),wx,getApp:()=>app,getCurrentPages:()=>[{route,options:{roomId:'7081',date:'2035-01-02',start:'14:30',end:'17:50'}}]},{filename:file});
 return {api:module.exports,storage,navigation,requests,app};
}
test('没有令牌时直接返回登录页，不向后端反复发送401请求',async()=>{
 const env=apiEnvironment();await assert.rejects(env.api.me(),e=>e.code==='UNAUTHENTICATED');assert.equal(env.requests.length,0);assert.equal(env.navigation.length,1);assert.match(decodeURIComponent(env.navigation[0]),/redirect=\/pages\/booking\/index\?roomId=7081/);
 await assert.rejects(env.api.me(),e=>e.code==='UNAUTHENTICATED');assert.equal(env.navigation.length,1);
});
test('过期令牌清除，保留返回预约表单的路径，不重定向循环',async()=>{
 const env=apiEnvironment('old-token');const request=env.api.me();env.requests[0].success({data:{ok:false,error:{code:'UNAUTHENTICATED',message:'登录已失效'}}});
 await assert.rejects(request,e=>e.code==='UNAUTHENTICATED');assert.equal(env.storage.has('token'),false);assert.equal(env.app.globalData.user,null);assert.equal(env.navigation.length,1);assert.match(decodeURIComponent(env.navigation[0]),/date=2035-01-02/);
});

test('账号选择页收到401清除会话，不再跳转登录入口形成循环',async()=>{
 const env=apiEnvironment('old-token','pages/account-select/index'),request=env.api.me();env.requests[0].success({data:{ok:false,error:{code:'UNAUTHENTICATED',message:'会话无效'}}});await assert.rejects(request,e=>e.code==='UNAUTHENTICATED');assert.equal(env.navigation.length,0);assert.equal(env.storage.has('token'),false);
});
test('登录页面是启动页，提交按钮不因未加载到用户而永久禁用',()=>{
 const app=JSON.parse(fs.readFileSync('miniprogram/app.json','utf8'));assert.equal(app.pages[0],'pages/login/index');
 const view=fs.readFileSync('miniprogram/pages/booking/index.wxml','utf8');assert.ok(!view.includes('disabled="{{busy || !user}}"'));assert.match(view,/负责老师/);assert.match(view,/借用人/);
});

function loginPages({mode='local',authenticate=async()=>({})}={}){
 const navigation=[],calls=[],wx={navigateTo:options=>{navigation.push(options.url);if(options.complete)options.complete();},switchTab:options=>navigation.push(options.url),reLaunch:options=>navigation.push(options.url)};
 const api={login:async account=>{calls.push(account);return authenticate(account);},error:(page,error)=>page.setData({error:error.message})};
 const navigationModule={exports:{}};vm.runInNewContext(fs.readFileSync('miniprogram/utils/login-navigation.js','utf8'),{module:navigationModule,wx});
 function page(name){const file=path.resolve('miniprogram/pages/'+name+'/index.js'),localRequire=createRequire(file);let definition;vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:value=>{definition=value;},wx,require:name=>name==='../../utils/api'?api:name==='../../config'?{mode}:name==='../../utils/login-navigation'?navigationModule.exports:localRequire(name)});return {...definition,data:structuredClone(definition.data),setData(values){Object.assign(this.data,values);}};}
 return {page,navigation,calls};
}
test('一站式入口只导航，选择账号后登录并恢复原预约路径',async()=>{
 const env=loginPages(),target='/pages/booking/index?roomId=7081&date=2035-01-02&start=14%3A30&end=17%3A50',entry=env.page('login');entry.onLoad({reason:'expired',redirect:encodeURIComponent(target)});entry.login();assert.equal(env.calls.length,0);assert.match(entry.data.error,/登录已失效/);
 const url=new URL('https://local'+env.navigation.at(-1)),accounts=env.page('account-select');accounts.onLoad({redirect:url.searchParams.get('redirect')});await accounts.login({currentTarget:{dataset:{account:'demo-teacher'}}});assert.deepEqual(env.calls,['demo-teacher']);assert.equal(env.navigation.at(-1),target);assert.equal(accounts.data.busy,false);
 const destination=require('../miniprogram/utils/login-navigation').destination;for(const redirect of ['https://example.com','/pages/login/index','/pages/account-select/index','%invalid'])assert.equal(destination({redirect}),'/pages/home/index');
});
test('账号选择限制重复提交和无效账号，失败仍可重试且不假设完成校园认证',async()=>{
 let resolve;const env=loginPages({authenticate:()=>new Promise(done=>{resolve=done;})}),accounts=env.page('account-select');accounts.onLoad({});await accounts.login({currentTarget:{dataset:{account:'unknown'}}});assert.equal(env.calls.length,0);
 const pending=accounts.login({currentTarget:{dataset:{account:'demo-student'}}});await accounts.login({currentTarget:{dataset:{account:'demo-admin'}}});assert.deepEqual(env.calls,['demo-student']);resolve({});await pending;assert.equal(env.navigation.at(-1),'/pages/home/index');
 const failed=loginPages({authenticate:async()=>{throw Error('网络连接失败');}}),retry=failed.page('account-select');retry.onLoad({});await retry.login({currentTarget:{dataset:{account:'demo-student'}}});assert.equal(retry.data.error,'网络连接失败');assert.equal(retry.data.busy,false);assert.equal(failed.navigation.length,0);
 const cloud=loginPages({mode:'cloud'}),cloudPage=cloud.page('account-select');await cloudPage.login({currentTarget:{dataset:{account:'demo-admin'}}});assert.equal(cloud.calls.length,0);
});
