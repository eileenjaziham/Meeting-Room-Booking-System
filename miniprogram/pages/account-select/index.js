const api=require('../../utils/api'),config=require('../../config'),navigation=require('../../utils/login-navigation');
Page({
 data:{local:config.mode==='local',busy:false,selectedAccount:'',error:'',accounts:[{id:'demo-student',label:'测试学生甲',type:'提交预约后等待审核',icon:'profile',tone:'blue'},{id:'demo-student2',label:'测试学生乙',type:'用于演示不同学生的预约',icon:'profile',tone:'blue'},{id:'demo-teacher',label:'测试教师',type:'合法预约提交后直接成功',icon:'profile',tone:'green'},{id:'demo-admin',label:'测试负责人',type:'预约审核、会议室管理及用户审核',icon:'admin',tone:'green'},{id:'demo-guest',label:'未核验测试用户',type:'演示身份提交与人工审核',icon:'profile',tone:'amber'}]},
 onLoad(query){this.destination=navigation.destination(query);},
 async login(e){
  if(this.data.busy)return;const account=e&&e.currentTarget&&e.currentTarget.dataset.account;
  if(this.data.local&&!this.data.accounts.some(item=>item.id===account)){this.setData({error:'请选择一个现有测试账号'});return;}
  if(!this.data.local&&account){this.setData({error:'当前云端环境不支持测试账号'});return;}
  this.setData({busy:true,selectedAccount:account||'',error:''});
  try{await api.login(account);navigation.finish(this.destination||'/pages/home/index');}
  catch(error){if(error.code==='UNAUTHENTICATED')this.setData({error:'登录未成功，请重新选择账号。'});else api.error(this,error);}
  finally{this.setData({busy:false,selectedAccount:''});}
 }
});
