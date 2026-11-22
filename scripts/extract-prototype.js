const fs=require('node:fs');const path=require('node:path');const zlib=require('node:zlib');const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');const source=path.join(root,'原型文件.pip');const buffer=fs.readFileSync(source);
const end=buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));if(end<0)throw Error('不是支持的 ZIP 容器');
let pos=buffer.readUInt32LE(end+16);const entries=[];const out=path.join(root,'design/extracted');fs.mkdirSync(out,{recursive:true});
while(buffer.readUInt32LE(pos)===0x02014b50){
 const nameSize=buffer.readUInt16LE(pos+28),extra=buffer.readUInt16LE(pos+30),comment=buffer.readUInt16LE(pos+32),size=buffer.readUInt32LE(pos+20),offset=buffer.readUInt32LE(pos+42),method=buffer.readUInt16LE(pos+10);
 const name=buffer.subarray(pos+46,pos+46+nameSize).toString('utf8');const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);
 if(![0,8].includes(method))throw Error('不支持的 ZIP 压缩方式');
 const data=method===8?zlib.inflateRawSync(buffer.subarray(start,start+size)):buffer.subarray(start,start+size);
 const info={name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
 if(name.endsWith('.png')){
  if(path.basename(name)!==name||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('不安全或无效的 PNG 条目');
  info.width=data.readUInt32BE(16);info.height=data.readUInt32BE(20);fs.writeFileSync(path.join(out,name),data);
 }else info.format=data.subarray(0,32).toString('utf8').replace(/[^\x20-\x7e]/g,'.');
 entries.push(info);pos+=46+nameSize+extra+comment;if(pos>=end)break;
}
fs.writeFileSync(path.join(root,'design/manifest.json'),JSON.stringify({source:path.basename(source),sourceBytes:buffer.length,sourceSha256:createHash('sha256').update(buffer).digest('hex'),parsedLayers:false,entries},null,2)+'\n');
console.log('提取 '+entries.filter(x=>x.width).length+' 个 PNG（含首页缩略图）；未解析完整专有图层。');
