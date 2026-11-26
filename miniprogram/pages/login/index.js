const navigation=require('../../utils/login-navigation');
Page({data:{opening:false,error:''},
 onLoad(query){this.destination=navigation.destination(query);if(query&&query.reason==='expired')this.setData({error:'登录已失效，请重新登录；已填写的预约信息会保留。'});},
 onShow(){this.setData({opening:false});},
 login(){if(this.data.opening)return;this.setData({opening:true});wx.navigateTo({url:'/pages/account-select/index?redirect='+encodeURIComponent(this.destination||'/pages/home/index'),fail:()=>this.setData({error:'暂时无法打开账号选择页，请重试。'}),complete:()=>this.setData({opening:false})});}
});
