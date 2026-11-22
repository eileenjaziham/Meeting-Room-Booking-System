const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');const mini=path.join(root,'miniprogram');
const files=[];function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else files.push(file);}}
for(const dir of ['miniprogram','server','scripts','tests','tests-postgres','cloudfunctions'])walk(path.join(root,dir));
let js=0,json=0;for(const file of files){if(file.endsWith('.js')){new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});js++;}if(file.endsWith('.json')){JSON.parse(fs.readFileSync(file,'utf8'));json++;}}
const app=JSON.parse(fs.readFileSync(path.join(mini,'app.json'),'utf8'));
if(require('../miniprogram/version').version!==require('../package.json').version)throw Error('小程序版本与 package.json 不一致，请运行 npm run version:sync');
if(!fs.readFileSync(path.join(root,'shared/booking-policy.json')).equals(fs.readFileSync(path.join(root,'cloudfunctions/api/shared/booking-policy.json')))||JSON.stringify(require('../miniprogram/booking-policy'))!==JSON.stringify(require('../shared/booking-policy.json')))throw Error('预约规则未同步，请运行 npm run cloud:prepare');
for(const file of files.filter(x=>x.startsWith(mini+path.sep)&&x.endsWith('.js')))if(/require\(\s*['"][^'"]+\.json['"]\s*\)/.test(fs.readFileSync(file,'utf8')))throw Error('小程序不能直接require JSON，请使用JS模块：'+file);
for(const page of app.pages)for(const ext of ['js','json','wxml','wxss'])if(!fs.existsSync(path.join(mini,page+'.'+ext)))throw Error('页面文件缺失：'+page+'.'+ext);
for(const entry of app.tabBar.list)for(const key of ['iconPath','selectedIconPath'])if(!fs.existsSync(path.join(mini,entry[key])))throw Error('导航图标缺失');
for(const [name,entry]of Object.entries(app.usingComponents))for(const ext of ['js','json','wxml','wxss'])if(!fs.existsSync(path.join(mini,entry+'.'+ext)))throw Error('组件文件缺失：'+name);
for(const file of ['db.js','schema.sql','service.js','seed.js'])if(!fs.readFileSync(path.join(root,'server',file)).equals(fs.readFileSync(path.join(root,'cloudfunctions/api/server',file))))throw Error('云函数未同步：'+file+'，请运行 npm run cloud:prepare');
console.log('结构检查通过：'+app.pages.length+' 页面、'+Object.keys(app.usingComponents).length+' 组件、'+js+' JS、'+json+' JSON；云函数副本一致。');
