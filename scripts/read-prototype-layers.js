const fs = require('node:fs');
const zlib = require('node:zlib');
const { decompress } = require('fzstd');
const { createHash } = require('node:crypto');
const buffer = fs.readFileSync('原型文件.pip');
const end = buffer.lastIndexOf(Buffer.from([80,75,5,6]));
const entries = {};
let pos = buffer.readUInt32LE(end+16);
while(buffer.readUInt32LE(pos)===0x02014b50){
  const nl=buffer.readUInt16LE(pos+28),el=buffer.readUInt16LE(pos+30),cl=buffer.readUInt16LE(pos+32),size=buffer.readUInt32LE(pos+20),off=buffer.readUInt32LE(pos+42),method=buffer.readUInt16LE(pos+10);
  const name=buffer.subarray(pos+46,pos+46+nl).toString();
  const start=off+30+buffer.readUInt16LE(off+26)+buffer.readUInt16LE(off+28);
  entries[name]=method===8?zlib.inflateRawSync(buffer.subarray(start,start+size)):buffer.subarray(start,start+size);
  pos+=46+nl+el+cl;if(pos>=end)break;
}
const raw=entries['原型文件.pip'];
const offset=raw.indexOf(Buffer.from([0x28,0xb5,0x2f,0xfd]));
const document=Buffer.from(decompress(raw.subarray(offset)));
const settings = new Map();
const pattern = /(7060|7052|7081|7091|7119)\s+容量\s*[:：]\s*(\d+)\s*人\s+设备\s*[:：]([^\0]+)/g;
for (const match of document.toString('utf8').matchAll(pattern)) {
  const row = { id: match[1], capacity: Number(match[2]), equipment: match[3].trim(), sourceText: match[0] };
  if (settings.has(row.id) && (settings.get(row.id).capacity !== row.capacity || settings.get(row.id).equipment !== row.equipment)) throw Error('原型同一房间存在冲突配置：' + row.id);
  settings.set(row.id, row);
}
if (settings.size !== 5) throw Error('未提取到完整的五间会议室配置');
const result = { source: '原型文件.pip', sourceSha256: createHash('sha256').update(buffer).digest('hex'), method: 'ZIP + Zstandard 解压，读取原型中的UTF-8房间文字；未宣称解码完整图层结构', rooms: ['7060','7081','7091','7119','7052'].map(id=>settings.get(id)) };
fs.writeFileSync('design/room-settings.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.rooms, null, 2));
