// 使用已有Edge无头渲染实际WXML派生的静态布局；这是布局QA，不是真机运行。
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url'),{JSDOM}=require('jsdom');
const meta=JSON.parse(fs.readFileSync('artifacts/latest-ui-review.json','utf8').replace(/^\uFEFF/,'')),browser='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(browser))throw Error('No existing Edge executable; no package will be installed');
const mode=process.argv[2]||'sample';const jobs=mode==='stress'?['home','room','booking','profile'].map(page=>({stage:'after',page,width:320,long:true})):mode==='all'?[...['home','room','booking','profile'].flatMap(page=>['before','after'].map(stage=>({stage,page,width:440}))),...['home','room','booking'].flatMap(page=>[320,375].map(width=>({stage:'after',page,width})))]:['before','after'].map(stage=>({stage,page:'home',width:440}));
const results=[];
if(mode==='cancellation'){
 const flowJobs=[320,440].flatMap(width=>[
  {stage:'after',page:'booking',width},{stage:'after',page:'result',width},
  {stage:'after',page:'reservation',width},{stage:'after',page:'reservation',width,admin:true}
 ]);
 jobs.splice(0,jobs.length,...flowJobs);
}
if(mode==='result'){jobs.splice(0,jobs.length,...[320,440].map(width=>({stage:'after',page:'result',width})));}
if(mode==='reminders'){
 const reminderJobs=[320,440].flatMap(width=>[
  {stage:'after',page:'home',width},{stage:'after',page:'home',width,admin:true},
  {stage:'after',page:'admin-rooms',width},{stage:'after',page:'admin-rooms',width,section:'manage-form'},
  {stage:'after',page:'admin-rooms',width,section:'block-history'},{stage:'after',page:'profile',width}
 ]);
 jobs.splice(0,jobs.length,...reminderJobs);
}
for(const job of jobs){
 const generation=spawnSync(process.execPath,['scripts/ui-render-review.js',job.stage,job.page,job.long?'long':job.admin?'admin':''],{encoding:'utf8',timeout:60000});if(generation.status!==0)throw Error(generation.stderr||generation.stdout||'preview generation failed');
 const suffix=job.long?'-long':job.admin?'-admin':'',name=job.stage+'-'+job.page+suffix+(job.section?'-'+job.section:'')+'-'+job.width,html=path.join(meta.root,job.stage+'-'+job.page+suffix+'.html'),png=path.join(meta.root,name+'.png');
 const run=spawnSync(browser,['--headless','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--user-data-dir='+path.join(meta.root,'edge-review-profile'),'--force-device-scale-factor=1','--window-size='+job.width+',956','--hide-scrollbars','--virtual-time-budget=2500','--screenshot='+png,'--dump-dom',pathToFileURL(html).href+(job.section?'#'+job.section:'')],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,windowsHide:true});
 if(run.status!==0||!fs.existsSync(png))throw Error(name+': '+(run.stderr||'screenshot failed'));
 const dom=new JSDOM(run.stdout),text=dom.window.document.querySelector('#qa-result')?.textContent;if(!text)throw Error(name+': missing QA data');const qa=JSON.parse(text);dom.window.close();
 results.push({...job,...qa,image:png});console.log(name+': overflow='+qa.overflow+', smallTargets='+qa.smallTargets.length+', brokenImages='+qa.brokenImages.length);
 fs.writeFileSync(path.join(meta.root,mode==='reminders'?'reminders-report.json':mode==='result'?'result-report.json':mode==='cancellation'?'cancellation-report.json':mode==='all'?'layout-report.json':mode==='stress'?'stress-report.json':'sample-report.json'),JSON.stringify(results,null,2));
}
if(results.some(result=>result.stage==='after'&&(result.overflow||result.smallTargets.length||result.brokenImages.length)))process.exitCode=1;
