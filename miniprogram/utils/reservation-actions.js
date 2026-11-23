const api=require('./api');
async function cancel(page,{id,admin=false,reason=''}){
 if(page.data.busy)return;
 reason=reason.trim();
 if(admin&&!reason){page.setData({error:'请填写管理员取消原因'});return;}
 page.setData({busy:true,error:''});
 try{
  const result=await wx.showModal({title:admin?'管理员取消此预约？':'确认取消预约？',content:admin?'取消后将释放时段，并向预约人发送取消原因。此操作不可恢复。':'仅可至少提前5小时取消。取消后不可恢复，重新预约不保证原时段可用。',confirmText:'确认取消',confirmColor:'#b42337'});
  if(!result.confirm)return;
  await api.call(admin?'admin.cancelReservation':'reservation.cancel',{id,...(admin?{reason}:{})});
  await page.load();wx.showToast({title:'已取消预约',icon:'success'});
 }catch(error){api.error(page,error);}
 finally{page.setData({busy:false});}
}
async function markRead(id){try{return await api.call('notification.readReservation',{id});}catch(error){return null;}}
module.exports={cancel,markRead};
