// 生成简单原生导航图标（PNG，无需图片服务）。
const fs=require('node:fs');const zlib=require('node:zlib');const path=require('node:path');
function crc(buf){let c=0xffffffff;for(const v of buf){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const sum=Buffer.alloc(4);sum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([len,name,data,sum]);}
function icon(name,kind,color){const width=72;const data=Buffer.alloc((width*4+1)*width);
 const distance=(x,y,x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1;const t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-x1-t*dx,y-y1-t*dy);};
 for(let y=0;y<width;y++)for(let x=0;x<width;x++){let draw=false;if(kind==='home')draw=[[12,32,36,12],[36,12,60,32],[18,29,18,59],[18,59,54,59],[54,59,54,29],[30,59,30,42],[30,42,42,42],[42,42,42,59]].some(l=>distance(x,y,...l)<2.5);else draw=Math.abs(Math.hypot(x-36,y-23)-11)<2.5||((x>=15&&x<=57&&y>=42&&y<=61)&&(Math.abs(Math.hypot((x-36)*.85,y-61)-19)<3||y>=58));if(draw){const i=y*(width*4+1)+1+x*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;}}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(width,4);ihdr[8]=8;ihdr[9]=6;fs.writeFileSync(path.join(__dirname,'../miniprogram/assets',name+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(data)),chunk('IEND',Buffer.alloc(0))]));}
fs.mkdirSync(path.join(__dirname,'../miniprogram/assets'),{recursive:true});for(const kind of ['home','user']){icon(kind,kind,[96,113,135]);icon(kind+'-active',kind,[37,99,235]);}
