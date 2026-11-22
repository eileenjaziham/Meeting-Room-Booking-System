const base=process.env.LOCAL_API_URL||'http://127.0.0.1:3000';
(async()=>{
 const health=await fetch(base+'/health').then(r=>r.json());
 if(!health.ok||!health.devLogin)throw Error('本地开发服务未就绪或测试登录关闭');
 const session=await fetch(base+'/dev/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:'demo-student'})}).then(r=>r.json());
 if(!session.ok)throw Error('测试登录失败');
 const date=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
 const rooms=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.data.token},body:JSON.stringify({action:'rooms.list',payload:{date}})}).then(r=>r.json());
 if(!rooms.ok||rooms.data.length!==5)throw Error('会议室读取失败');
 console.log(JSON.stringify({health:'ok',database:health.database,mode:health.mode,rooms:rooms.data.map(x=>({id:x.id,capacity:x.capacity})),date},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
