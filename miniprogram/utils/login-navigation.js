function destination(query){
 if(query&&typeof query.redirect==='string'){try{const value=query.redirect.startsWith('/pages/')?query.redirect:decodeURIComponent(query.redirect),route=value.split('?')[0];if(/^\/pages\/[a-z-]+\/index(?:\?|$)/.test(value)&&!['/pages/login/index','/pages/account-select/index'].includes(route))return value;}catch(error){/* 无效回跳参数使用首页。 */}}
 return '/pages/home/index';
}
function finish(value){const route=value.split('?')[0];if(['/pages/home/index','/pages/profile/index'].includes(route))wx.switchTab({url:route});else wx.reLaunch({url:value});}
module.exports={destination,finish};
