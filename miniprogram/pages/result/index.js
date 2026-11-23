const api=require('../../utils/api');
const actions=require('../../utils/reservation-actions');
Page({data:{record:null,error:'',busy:false},onLoad(q){this.id=q.id;},onShow(){if(this.id)return this.load();},async load(){try{const record=await api.call('reservation.detail',{id:this.id});this.setData({record,error:''});await actions.markRead(this.id);}catch(e){api.error(this,e);}},cancel(){return actions.cancel(this,{id:this.id});},detail(){wx.redirectTo({url:'/pages/reservation/index?id='+this.id});},home(){wx.switchTab({url:'/pages/home/index'});}});
