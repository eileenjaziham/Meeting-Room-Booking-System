// 仅将原有前端配色归并为语义变量，不改变WXML事件、预约规则或校园素材。
const fs=require('node:fs'),path=require('node:path');
const aliases={};
for(const color of ['#3478ff','#3273ff','#3475ff','#3976ff','#477fe2','#3971d3','#2e69d9','#3d6bb5'])aliases[color]='--ui-primary';
for(const color of ['#edf3ff','#eef4ff','#f0f5ff','#eaf2ff','#edf4ff'])aliases[color]='--ui-primary-soft';
for(const color of ['#718096','#7d8a9e','#8a9ab0','#92a0b4','#91a0b5','#a0aec0','#7c8da6','#6c829f','#8390a1','#77859b','#8490a1','#7592bc','#8290a3','#617a9f','#7086a8','#9aa7b9','#94a3b8','#8699b4','#8395af','#6a83a5','#92a1b5'])aliases[color]='--ui-text-muted';
for(const color of ['#e7eef8','#edf2f8','#edf1f7','#dce7fa'])aliases[color]='--ui-border';
let changed=0;function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(file.endsWith('.wxss')){const before=fs.readFileSync(file,'utf8'),after=before.replace(/#[0-9a-f]{6}\b/gi,hex=>aliases[hex.toLowerCase()]?'var('+aliases[hex.toLowerCase()]+')':hex);if(after!==before){fs.writeFileSync(file,after);changed++;}}}}
walk(path.resolve('miniprogram/pages'));
for(const file of fs.readdirSync('miniprogram/assets/icons').filter(x=>x.endsWith('.svg'))){const dest=path.join('miniprogram/assets/icons',file),before=fs.readFileSync(dest,'utf8'),after=before.replace(/#4779c9/g,'#2563eb');if(after!==before)fs.writeFileSync(dest,after);}
console.log('统一配色：'+changed+'个页面样式文件；校园图片未修改。');
