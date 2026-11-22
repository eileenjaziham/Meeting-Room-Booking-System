const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'cloudfunctions/api/server');
fs.mkdirSync(out,{recursive:true});
for(const file of ['db.js','schema.sql','service.js','seed.js'])fs.copyFileSync(path.join(root,'server',file),path.join(out,file));
console.log('云函数服务端已同步：'+out+'（未部署）');
