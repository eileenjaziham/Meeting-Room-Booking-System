const api=require('./api');
function invoke(fn,options){return new Promise((resolve,reject)=>fn({...options,success:resolve,fail:reject}));}
async function change(page,event){
  const path=event.detail&&event.detail.avatarUrl;
  if(!path||!page.data.user||page.data.avatarBusy)return;
  const userId=page.data.user.id;
  const update=values=>{if(!page.unloaded)page.setData(values);};
  update({avatarBusy:true,error:''});
  try{
    const compressed=await invoke(options=>wx.compressImage(options),{src:path,quality:75,compressedWidth:256,compressedHeight:256});
    const fs=wx.getFileSystemManager();
    const file=await invoke(options=>fs.readFile(options),{filePath:compressed.tempFilePath,encoding:'base64'});
    const data=file.data;
    const mime=data.startsWith('/9j/')?'jpeg':data.startsWith('iVBORw0KGgo')?'png':null;
    if(!mime)throw new Error('请选择PNG或JPG格式的头像');
    if(data.length>Math.ceil(64*1024/3)*4)throw new Error('头像图片过大，请重新选择较小的图片');
    if(page.unloaded||!getApp().globalData.user||getApp().globalData.user.id!==userId)return;
    const user=await api.call('profile.updateAvatar',{avatarUrl:'data:image/'+mime+';base64,'+data});
    if(user.id!==userId||!getApp().globalData.user||getApp().globalData.user.id!==userId)return;
    getApp().globalData.user=user;update({user});
    if(!page.unloaded)wx.showToast({title:'头像已更新',icon:'success'});
  }catch(e){if(e.code!=='UNAUTHENTICATED')update({error:e.message||'头像更新失败，请重新选择'});}
  finally{update({avatarBusy:false});}
}
module.exports={change};
