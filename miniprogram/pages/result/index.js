const api=require('../../utils/api');
Page({data:{record:null,error:''},onLoad(q){this.id=q.id;this.load();},async load(){try{const record=await api.call('reservation.detail',{id:this.id});this.setData({record,error:''});}catch(e){api.error(this,e);}},detail(){wx.redirectTo({url:'/pages/reservation/index?id='+this.id});},home(){wx.switchTab({url:'/pages/home/index'});}});
