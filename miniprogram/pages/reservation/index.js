const api=require('../../utils/api');
function stamp(value){return value?new Date(value+8*3600000).toISOString().replace('T',' ').slice(0,16):'';}
const actions=require('../../utils/reservation-actions');
Page({
 data:{record:null,admin:false,reason:'',cancelReason:'',busy:false,error:'',createdAt:'',reviewedAt:'',cancelledAt:'',cancelDeadline:''},
 onLoad(q){this.id=q.id;this.setData({admin:q.admin==='1'});},onShow(){return this.load();},
 async load(){try{const record=await api.call(this.data.admin?'admin.reservationDetail':'reservation.detail',{id:this.id});this.setData({record,error:'',createdAt:stamp(record.createdAt),reviewedAt:stamp(record.reviewedAt),cancelledAt:stamp(record.cancelledAt),cancelDeadline:stamp(record.cancelDeadline)});if(!this.data.admin)await actions.markRead(this.id);}catch(e){api.error(this,e);}},
 reason(e){this.setData({reason:e.detail.value});},cancelReason(e){this.setData({cancelReason:e.detail.value});},
 cancel(){return actions.cancel(this,{id:this.id,admin:this.data.admin,reason:this.data.cancelReason});},
 async review(e){if(this.data.busy)return;const decision=e.currentTarget.dataset.decision;if(decision==='reject'&&!this.data.reason.trim()){this.setData({error:'拒绝必须提供原因'});return;}const confirm=await wx.showModal({title:decision==='approve'?'批准申请？':'拒绝申请？',content:'服务端将复核最新状态与业务规则。'});if(!confirm.confirm)return;this.setData({busy:true,error:''});try{await api.call('admin.reviewReservation',{id:this.id,decision,reason:this.data.reason});await this.load();wx.showToast({title:'审核已完成'});}catch(e){api.error(this,e);}finally{this.setData({busy:false});}}
});
