const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');
function apiEnvironment(token) {
 const storage=new Map(token?[['token',token]]:[]),navigation=[],requests=[];const app={globalData:{user:{id:'demo-student'}}};
 const wx={getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,v),removeStorageSync:k=>storage.delete(k),reLaunch:o=>navigation.push(o.url),request:o=>requests.push(o)};
 const file=path.resolve('miniprogram/utils/api.js');const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:createRequire(file),wx,getApp:()=>app,getCurrentPages:()=>[{route:'pages/booking/index',options:{roomId:'7081',date:'2035-01-02',start:'14:30',end:'17:50'}}]},{filename:file});
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
test('登录页面是启动页，提交按钮不因未加载到用户而永久禁用',()=>{
 const app=JSON.parse(fs.readFileSync('miniprogram/app.json','utf8'));assert.equal(app.pages[0],'pages/login/index');
 const view=fs.readFileSync('miniprogram/pages/booking/index.wxml','utf8');assert.ok(!view.includes('disabled="{{busy || !user}}"'));assert.match(view,/负责老师/);assert.match(view,/借用人/);
});
