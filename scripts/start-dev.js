'use strict';
const fs=require('node:fs'),path=require('node:path');
const {networkOptions}=require('../server/dev-network');
const lan=process.argv.includes('--lan');
if(lan){
 if(!process.env.LAN_HOST)throw Error('请复制.env.lan.example为.env.lan，填写LAN_HOST和LAN_CLIENT_IPS');
 process.env.HOST=process.env.LAN_HOST;process.env.ALLOW_LAN_DEV_LOGIN='true';
}else process.env.ALLOW_LAN_DEV_LOGIN='false';
const network=networkOptions(),port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT须为1—65535之间的整数');
const host=network.host.includes(':')?'['+network.host+']':network.host;
const config={mode:'local',baseUrl:'http://'+host+':'+port,envId:'',functionName:'api'};
fs.writeFileSync(path.resolve(__dirname,'../miniprogram/config.js'),'// 由npm start / npm run start:lan按当前调试模式生成，不含密钥。\nmodule.exports = '+JSON.stringify(config,null,2)+';\n');
console.log('小程序接口已切换：'+config.baseUrl+'；请在微信开发者工具重新编译。');
require('../server/local');
