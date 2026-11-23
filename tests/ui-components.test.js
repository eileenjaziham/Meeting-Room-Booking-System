const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
test('新UI组件的快捷入口、房间打开、时间事件和人数加减保持可交互',async()=>{
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<html><head></head><body></body></html>');for(const key of ['window','document','Element','Event','CustomEvent','HTMLElement','getComputedStyle'])global[key]=dom.window[key]||dom.window;
 const simulate=require('miniprogram-simulate'),root=path.resolve('miniprogram');
 const load=name=>simulate.load(path.join(root,'components',name,'index'),{rootPath:root});
 const field=simulate.render(load('form-field'),{name:'attendees',label:'人数',stepper:true,value:'9',max:10});field.attach(document.body);let changed;
 field.addEventListener('change',e=>{changed=e.detail;});field.querySelectorAll('.step-button')[1].dispatchEvent('tap');await simulate.sleep(0);assert.deepEqual(changed,{field:'attendees',value:'10'});field.setData({value:'10'});field.instance.step({currentTarget:{dataset:{delta:1}}});await simulate.sleep(0);assert.equal(changed.value,'10');field.instance.onFocus();assert.equal(field.instance.data.focused,true);field.instance.onBlur({detail:{value:'10'}});assert.equal(field.instance.data.focused,false);
 const quick=simulate.render(load('quick-entry'),{label:'我的预约',icon:'/assets/icons/calendar.svg',badge:true});quick.attach(document.body);assert.equal(quick.querySelectorAll('.reminder-dot').length,1);quick.setData({badge:false});await simulate.sleep(0);assert.equal(quick.querySelectorAll('.reminder-dot').length,0);let selected=0;quick.addEventListener('select',()=>selected++);quick.querySelector('.entry').dispatchEvent('tap');await simulate.sleep(0);assert.equal(selected,1);
 const card=simulate.render(load('room-card'),{room:{id:'7060',number:'7060',capacity:10,equipment:'屏幕',occupied:[]}});card.attach(document.body);let opened;card.addEventListener('open',e=>{opened=e.detail.id;});card.querySelector('.room-card').dispatchEvent('tap');await simulate.sleep(0);assert.equal(opened,'7060');assert.match(card.dom.textContent,/暂无占用/);
 const time=simulate.render(load('time-selector'),{dateOptions:[{date:'2035-01-02',label:'1月2日 星期二'}],dateLabel:'1月2日 星期二',start:'14:30',end:'17:50',startOptions:['14:30'],endOptions:['17:50'],hasAvailable:true,occupied:[]});time.attach(document.body);let detail;time.addEventListener('timechange',e=>{detail=e.detail;});time.instance.time({currentTarget:{dataset:{field:'end'}},detail:{value:[0,0]}});await simulate.sleep(0);assert.deepEqual(detail,{field:'end',value:0});assert.match(time.dom.textContent,/14:30/);assert.match(time.dom.textContent,/17:50/);
 assert.match(time.dom.textContent,/当前选择/);const schedule=simulate.render(load('schedule-bar'),{selectedStart:'14:30',selectedEnd:'17:50',occupied:[]});schedule.attach(document.body);assert.ok(schedule.instance.data.selected);schedule.setData({occupied:[{start:'16:00',end:'18:00'}]});await simulate.sleep(0);assert.equal(schedule.instance.data.selected,null);
 time.setData({start:'08:05',startOptions:['08:00','08:05','09:45','09:50']});await simulate.sleep(0);time.instance.column({currentTarget:{dataset:{field:'start'}},detail:{column:0,value:1}});assert.deepEqual(time.instance.data.startWheel.minutes,['45','50']);assert.equal(time.instance.data.start,'08:05','仅滚动不能改变已确认时间');time.instance.cancel({currentTarget:{dataset:{field:'start'}}});assert.deepEqual(time.instance.data.startWheel.value,[0,1]);
 time.instance.column({currentTarget:{dataset:{field:'start'}},detail:{column:0,value:1}});time.instance.time({currentTarget:{dataset:{field:'start'}},detail:{value:[1,1]}});await simulate.sleep(0);assert.deepEqual(detail,{field:'start',value:3});time.setData({disabled:true});time.instance.time({currentTarget:{dataset:{field:'start'}},detail:{value:[0,0]}});await simulate.sleep(0);assert.equal(detail.value,3,'禁用时不提交滚轮选择');
 for(const item of [field,quick,card,time,schedule])item.detach();dom.window.close();
});

test('表单错误定位后可连续输入，失焦后解除强制焦点',()=>{
 const fs=require('node:fs'),vm=require('node:vm');let page;
 vm.runInNewContext(fs.readFileSync('miniprogram/pages/booking/index.js','utf8'),{require:()=>({}),Page:definition=>{page=definition;}});
 page.data=structuredClone(page.data);page.setData=values=>Object.assign(page.data,values);
 page.reportField('responsibleTeacher','请填写负责老师');
 for(const value of ['曹','曹老师']){page.field({detail:{field:'responsibleTeacher',value}});assert.equal(page.data.focusField,'responsibleTeacher');assert.equal(page.data.responsibleTeacher,value);assert.equal(page.data.fieldErrors.responsibleTeacher,'');}
 page.blur({detail:{field:'responsibleTeacher',value:'曹老师'}});assert.equal(page.data.focusField,'');
});

test('主题正文、按钮与状态标签文字对比度至少4.5:1',()=>{
 const fs=require('node:fs'),css=fs.readFileSync('miniprogram/styles/tokens.wxss','utf8');
 const tokens=Object.fromEntries([...css.matchAll(/--ui-([\w-]+):\s*(#[\da-f]+)/g)].map(match=>[match[1],match[2]]));
 const luminance=hex=>{let color=hex.slice(1);if(color.length===3)color=[...color].map(c=>c+c).join('');const rgb=color.match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 const pairs=[['text','surface'],['text-muted','surface'],['text-secondary','surface'],['text-muted','background'],['surface','primary'],...['primary','success','warning','danger','neutral'].map(name=>[name,name+'-soft'])];
 for(const [text,background]of pairs){const a=luminance(tokens[text]),b=luminance(tokens[background]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${text}/${background}: ${ratio.toFixed(2)}`);}
});

