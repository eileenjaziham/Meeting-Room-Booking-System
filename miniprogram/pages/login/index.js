const api = require('../../utils/api');
const config = require('../../config');
Page({ data: { local: config.mode === 'local', busy: false, error: '', accounts: [{ id:'demo-student', label:'测试学生甲', type:'提交后待确认' },{ id:'demo-student2', label:'测试学生乙', type:'用于并发预约演示' },{ id:'demo-teacher', label:'测试教师', type:'合法预约直接成功' },{ id:'demo-admin', label:'测试负责人', type:'独立授权；自身为学生' },{ id:'demo-guest', label:'未核验测试用户', type:'演示人工身份审核' }] },
  async login(e) { if(this.data.busy)return; this.setData({busy:true,error:''}); try { await api.login(e.currentTarget.dataset.account); wx.switchTab({url:'/pages/home/index'}); } catch(err){api.error(this,err);} finally{this.setData({busy:false});} }
});
