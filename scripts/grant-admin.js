// 管理员授权仅在服务端命令行执行，不能由小程序调用。
const {openDatabase}=require('../server/db');
const {randomUUID}=require('node:crypto');
const id=process.argv[2];
if(!id){console.error('用法：node --env-file-if-exists=.env scripts/grant-admin.js <已登录用户ID>');process.exitCode=1;}
else (async()=>{const db=await openDatabase();try{await db.transact(s=>{if(!s.users.some(x=>x.id===id))throw Error('用户尚未建立微信会话');if(!s.grants.some(x=>x.id===id))s.grants.push({id,source:'operator-cli',createdAt:Date.now()});s.audit.push({id:randomUUID(),actorId:'operator-cli',objectId:id,operation:'admin.grant',at:Date.now()});});console.log('已授权此用户。身份资格仍需单独核验。');}finally{await db.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
