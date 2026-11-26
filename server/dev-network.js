'use strict';
const {isIP}=require('node:net');
const loopback=new Set(['127.0.0.1','localhost','::1']);
function privateIPv4(value){if(isIP(value)!==4)return false;const [a,b]=value.split('.').map(Number);return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168);}
function clientAddress(value){return (value||'').replace(/^::ffff:/,'');}
function networkOptions(env=process.env){
 const host=env.HOST||'127.0.0.1',devLogin=env.ENABLE_DEV_LOGIN!=='false',lanDemo=env.ALLOW_LAN_DEV_LOGIN==='true';
 if(lanDemo){
  if(!privateIPv4(host))throw Error('局域网演示必须绑定电脑的私有IPv4地址，不能绑定公网或0.0.0.0');
  const clients=(env.LAN_CLIENT_IPS||'').split(',').map(value=>value.trim()).filter(Boolean);
  if(!clients.length||clients.some(value=>!privateIPv4(value)))throw Error('请在LAN_CLIENT_IPS中填写手机的局域网IPv4地址');
  return {host,devLogin,lanDemo,allowedClients:[...new Set([host,'127.0.0.1','::1',...clients])]};
 }
 if(devLogin&&!loopback.has(host))throw Error('测试账号登录默认仅允许本机；局域网演示请使用npm run start:lan');
 return {host,devLogin,lanDemo:false};
}
module.exports={networkOptions,clientAddress};
