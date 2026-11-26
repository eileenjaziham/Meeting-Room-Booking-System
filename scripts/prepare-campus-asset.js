// 使用原型里的同款高清PNG；仅重压IDAT数据流，不改变像素、尺寸或构图。
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),source=path.join(root,'design/extracted/63352a7a279b532fbd13660090b6216345fef451.png'),target=path.join(root,'miniprogram/assets/campus-hd.png');
function crc(buffer){let value=0xffffffff;for(const byte of buffer){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([size,name,data,checksum]);}
const original=fs.readFileSync(source),signature=Buffer.from([137,80,78,71,13,10,26,10]);if(!original.subarray(0,8).equals(signature))throw Error('原图不是PNG');
const chunks=[];for(let offset=8;offset<original.length;){const size=original.readUInt32BE(offset),type=original.subarray(offset+4,offset+8).toString(),end=offset+size+12;if(end>original.length)throw Error('PNG数据不完整');chunks.push({type,data:original.subarray(offset+8,offset+8+size)});offset=end;}
const header=chunks.find(item=>item.type==='IHDR').data,raw=zlib.inflateSync(Buffer.concat(chunks.filter(item=>item.type==='IDAT').map(item=>item.data))),compressed=zlib.deflateSync(raw,{level:9});
if(!zlib.inflateSync(compressed).equals(raw))throw Error('无损校验失败');
const result=[signature];let written=false;for(const item of chunks){if(item.type==='IDAT'){if(!written){result.push(chunk('IDAT',compressed));written=true;}}else result.push(chunk(item.type,item.data));}
const output=Buffer.concat(result);fs.writeFileSync(target,output);console.log(JSON.stringify({source:path.relative(root,source),target:path.relative(root,target),width:header.readUInt32BE(0),height:header.readUInt32BE(4),sourceBytes:original.length,outputBytes:output.length,identicalPixelStream:true}));
