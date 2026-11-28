// 从真实WXML、WXSS和组件状态生成布局预览；不冒充微信/真机渲染。
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {JSDOM}=require('jsdom');
const metadata=JSON.parse(fs.readFileSync('artifacts/latest-ui-review.json','utf8').replace(/^\uFEFF/,''));
const stage=process.argv[2]||'after',page=process.argv[3]||'home',longText=process.argv[4]==='long',sourceRoot=stage==='before'?path.join(metadata.root,'before/miniprogram'):path.resolve('miniprogram');
if(!['before','after'].includes(stage)||!['home','room','booking','profile','result','reservation','admin-rooms','login','account-select'].includes(page))throw Error('Invalid preview target');
function copyTree(source,dest){fs.mkdirSync(dest,{recursive:true});for(const item of fs.readdirSync(source,{withFileTypes:true})){const from=path.join(source,item.name),to=path.join(dest,item.name);if(item.isDirectory())copyTree(from,to);else if(item.isFile())fs.copyFileSync(from,to);}}
const root=path.join(metadata.root,'render-source-'+stage);copyTree(sourceRoot,root);
// 测试库仅在页面JSON已有usingComponents对象时合并全局注册；补在临时副本中，不改产品源码。
const pageJsonPath=path.join(root,'pages',page,'index.json'),pageJson=JSON.parse(fs.readFileSync(pageJsonPath,'utf8'));pageJson.usingComponents=pageJson.usingComponents||{};fs.writeFileSync(pageJsonPath,JSON.stringify(pageJson));
const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>');
for(const key of ['window','document','Element','Event','HTMLElement','getComputedStyle'])global[key]=dom.window[key]||dom.window;
global.wx={getStorageSync:()=>'',getWindowInfo:()=>({statusBarHeight:24})};global.getApp=()=>({globalData:{user:null}});
const simulate=require('miniprogram-simulate'),styles=require('miniprogram-simulate/src/wxss'),postcss=require('postcss');
const dates=require(path.join(root,'utils/date')),availability=require(path.join(root,'utils/availability'));
const day='2026-11-24',first='2026-11-23',clock=Date.parse(first+'T07:00:00+08:00');
const user={id:'preview-student',name:'张同学',studentNo:'DEMO-S001',phone:'13800000000',identityType:'student',verification:'approved',isAdmin:false};
const rooms=[['7060',10,'屏幕'],['7081',10,'屏幕'],['7091',10,'屏幕'],['7119',100,'投影、音响、话筒'],['7052',40,'屏幕']].map(([id,capacity,equipment],index)=>({id,number:id,capacity,equipment,location:'南湖校区综合楼七楼',open:'08:00—22:00',photo:'/assets/meeting.png',photoNote:'原型示意图，非该房间实拍',occupied:index===0?[{start:'14:30',end:'17:50',label:'已占用'}]:[]}));
const options=dates.options(first),all=dates.calendar(2026,11,day,first),start=Math.max(0,Math.floor(all.findIndex(x=>x.selected)/7)*7);
const choice=availability.choices(rooms[0].occupied,day,clock,'09:15','11:45');
const fixtures={
 login:{opening:false,error:''},
 'account-select':{local:true,busy:false,error:''},
 home:{user,rooms,date:day,dateLabel:dates.label(day),firstDate:first,lastDate:'2026-11-29',year:2026,month:11,days:all.slice(start,start+14).map(item=>({...item,bookingCount:item.date===day?2:0})),bookingDates:{[day]:2},unreadCount:2,statusHeight:24,loading:false,error:'',canPrevMonth:false,canNextMonth:false},
 room:{user,room:rooms[0],date:day,dateLabel:dates.label(day),dateOptions:options,dateIndex:1,...choice,loading:false,error:'',isToday:false},
 booking:{user,roomId:'7060',date:day,dateLabel:dates.label(day),start:'09:15',end:'11:45',capacity:10,loading:false,ready:true,busy:false,responsibleTeacher:'李老师',borrowerName:'张同学',purpose:'课题组研讨',attendees:'6',phone:'13800000000',notes:'需要使用会议室屏幕。',fieldErrors:{},error:'',occupied:rooms[0].occupied},
 profile:{user,error:'',avatarBusy:false,unreadCount:2},
 result:{record:{id:'preview-reservation',roomId:'7081',date:day,start:'14:30',end:'17:50',status:'approved',statusText:'预约成功',canCancel:true,accessCode:'70811234#'},busy:false,error:''},
 reservation:{record:{id:'preview-reservation',roomId:'7081',date:day,start:'14:30',end:'17:50',status:'approved',statusText:'预约成功',canCancel:true,canAdminCancel:true,accessCode:'70811234#',applicantName:'张同学',studentNo:'DEMO-S001',responsibleTeacher:'李老师',borrowerName:'张同学',purpose:'课程研讨',attendees:6,phone:'13800000000'},admin:process.argv[4]==='admin',cancelDeadline:'2026-11-24 09:30',createdAt:'2026-11-23 08:00',cancelReason:'学院会议安排',busy:false,error:''},
};
const managementRooms=rooms.map((room,index)=>({...room,blockCount:index===0?1:0,blocks:index===0?[{id:'preview-block',statusText:'已安排',canRelease:true,startDate:day,endDate:day,start:'14:30',end:'17:50',reason:'会议设备检修与维护安排',cancelledCount:2,createdByName:'管理员'}]:[]}));
fixtures['admin-rooms']={rooms:managementRooms,selected:managementRooms[0],dateOptions:options,startDateIndex:1,endDateIndex:1,startDateLabel:dates.label(day),endDateLabel:dates.label(day),start:'14:30',end:'17:50',startIndex:78,endIndex:117,reason:'会议设备检修与维护安排',loading:false,busy:false,error:'',preview:{affected:[{id:'preview-affected',borrowerName:'张同学',status:'approved',statusText:'预约成功',date:day,start:'14:30',end:'17:50'}]}};
if(page==='home'&&process.argv[4]==='admin'){user.isAdmin=true;fixtures.home.adminStats={reservations:3,identities:1,feedback:2,total:12};}
if(!fixtures[page])throw Error('Unknown preview page');
if(longText){user.name='张同学（计算机学院会议室预约长姓名测试）';rooms[0].equipment='屏幕、无线投屏与会议设备说明：用于验证小屏幕下长文本自然换行及卡片边界。';if(page==='booking'){fixtures.booking.fieldErrors={phone:'请输入有效的中国大陆11位手机号，便于负责老师联系借用人。'};fixtures.booking.error='预约时段刚刚发生变化，请保留已填内容，返回重新选择空闲时间后再次提交。';}}
global.Page=definition=>Component({data:{...definition.data,...fixtures[page]},methods:Object.fromEntries(Object.entries(definition).filter(([key,value])=>typeof value==='function'&&!/^on[A-Z]/.test(key)))});
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
const prefix='page-'+page,pagePath=path.join(root,'pages',page,'index');
const id=simulate.load(pagePath,prefix,{rootPath:root,usingComponents:structuredClone(app.usingComponents)}),component=simulate.render(id);
component.attach(document.body);
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function render(node){
 if(node.nodeType===3)return escape(node.textContent);if(node.nodeType!==1)return '';
 const name=node.tagName.toLowerCase(),native=name.startsWith('wx-'),tag=native?({view:'div',text:'span',image:'img',button:'button',input:'input',textarea:'textarea',picker:'div',label:'label'}[name.slice(3)]||'div'):name;
 // 读取模拟器已展开的组件DOM，原生节点未反射的属性从其已求值模板中补全。
 const template=node.__wxElement&&node.__wxElement._vt,attrs=Object.fromEntries([...node.attributes].map(item=>[item.name,item.value]));
 for(const item of template&&template.attrs||[]){if(item.name==='class'||item.value===null||item.value===undefined||typeof item.value==='object')continue;let name=item.name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value=item.value;
  if(name==='src'&&String(value).startsWith('/'))value=pathToFileURL(path.join(root,String(value))).href;
  if(name==='disabled'){if(!value)continue;attrs['aria-disabled']='true';}
  attrs[name]=value;
 }
 if(template&&template.event&&template.event.tap)attrs['data-touch']='tap';
 if(name==='wx-picker'){attrs['data-touch']='picker';attrs.role='button';}
 if(tag==='img'){attrs.alt=attrs['aria-label']||'';attrs.style=(attrs.style||'')+';object-fit:'+(attrs.mode==='aspectFill'?'cover':'contain')+';';if(attrs.mode==='widthFix')attrs.style+='height:auto;';}
 if(tag==='button')attrs.type='button';
 const attributes=Object.entries(attrs).map(([key,value])=>' '+key+'="'+escape(value)+'"').join('');
 function shadowMarkup(item){const element=item[String.fromCharCode(36,36)];if(element)return render(element);if(item.__virtual)return (item.childNodes||[]).map(shadowMarkup).join('');return item.textContent?escape(item.textContent):'';}
 const shadow=!native&&node.__wxElement&&node.__wxElement.shadowRoot;
 const content=tag==='textarea'?escape(attrs.value||''):node.childNodes.length?[...node.childNodes].map(child=>render(child)).join(''):shadow?(shadow.childNodes||[]).map(shadowMarkup).join(''):'';
 if(['img','input'].includes(tag))return '<'+tag+attributes+'>';
 return '<'+tag+attributes+'>'+content+'</'+tag+'>';
}
function css(file,scope){const parsed=postcss.parse(styles.getContent(file));parsed.walkRules(rule=>{rule.selector=rule.selector.replace(/\.([_a-zA-Z][\w-]*)/g,(_,name)=>'.'+scope+'--'+name).replace(/:host/g,scope||'body').replace(/(^|[\s>+~,])(page|view|text|image)(?=($|[\s>+~,.#:[\]]))/g,(all,before,name)=>before+({page:'body',view:'div',text:'span',image:'img'}[name]));});return parsed.toString();}
setImmediate(()=>{
 let rules=css(path.join(root,'app.wxss'),prefix)+css(pagePath+'.wxss',prefix);
 for(const [name,entry]of Object.entries(app.usingComponents))rules+=css(path.join(root,entry+'.wxss'),name);
 // Native chrome is an approximate review frame, separate from actual page templates.
 const nativeHeader=page==='home'?'<div class="preview-status">9:41</div>':'<div class="preview-header"><div>9:41</div><div class="preview-title">'+({room:'会议室与时间选择',booking:'填写预约信息',profile:'我的',result:'预约结果',reservation:'预约详情','admin-rooms':'会议室管理',login:'统一身份认证','account-select':'选择演示账号'}[page]||'')+'</div></div>';
 const tabs=['home','profile'].includes(page)?'<nav class="preview-tabs"><div><img src="'+pathToFileURL(path.join(root,'assets',page==='home'?'home-active.png':'home.png')).href+'"><span>首页</span></div><div><img src="'+pathToFileURL(path.join(root,'assets',page==='profile'?'user-active.png':'user.png')).href+'"><span>我的</span></div></nav>':'';
 const base='html,body{margin:0;width:100%;min-height:100%;}body{overflow-x:hidden}div,span,img,input,textarea,button{box-sizing:border-box}img{display:block}button,input,textarea{font-family:inherit}button{border:0;appearance:none}label{display:block}'+Object.keys(app.usingComponents).map(name=>name+'{display:block;min-width:0}').join('')+prefix+'{display:block}'+'.preview-status{position:absolute;top:0;left:14px;height:24px;font-size:11px;z-index:5;display:flex;align-items:center}.preview-header{height:68px;background:#e7f1ff;font-size:11px;padding:8px 16px 0}.preview-title{height:44px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}.preview-tabs{position:fixed;bottom:0;left:0;right:0;height:78px;background:white;border-top:1px solid #e5ecf6;display:flex;z-index:100;padding:8px 0 18px}.preview-tabs>div{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:4px;font-size:12px;color:#52647a}.preview-tabs img{width:24px;height:24px}'+(tabs?'body{padding-bottom:78px}':'');
 const qa=`window.addEventListener('load',()=>{setTimeout(()=>{const targets=[...document.querySelectorAll('[data-touch],button,input,textarea')].filter(e=>e.getClientRects().length&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');const result={width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,smallTargets:targets.map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,25),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(r=>r.width<43.5||r.height<43.5),brokenImages:[...document.images].filter(e=>!e.complete||!e.naturalWidth).map(e=>e.src)};document.getElementById('qa-result').textContent=JSON.stringify(result);},100);});`;
 const content=render(component.dom);if(stage==='after'&&page==='home'&&!user.isAdmin&&!content.includes('room-card--room-thumb'))throw Error('Preview did not expand room-card children');
 let html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+stage+' '+page+' — WXML layout preview, not device capture</title><style>'+base+rules+'</style></head><body>'+nativeHeader+content+tabs+'<pre id="qa-result" style="display:none"></pre><script>'+qa+'</script></body></html>';
 html=html.replace(/(-?\d*\.?\d+)rpx/g,(_,value)=>'calc('+value+' * 100vw / 750)');
 const file=path.join(metadata.root,stage+'-'+page+(longText?'-long':process.argv[4]==='admin'?'-admin':'')+'.html');fs.writeFileSync(file,html);console.log(file);component.detach();dom.window.close();
});
