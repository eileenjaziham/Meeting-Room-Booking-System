const api=require('../../utils/api');
const dates=require('../../utils/date');
const times=Array.from({length:169},(_,i)=>String(8+Math.floor(i*5/60)).padStart(2,'0')+':'+String(i*5%60).padStart(2,'0'));
const PHOTO_MAX=800*1024;
function invoke(fn,options){return new Promise((resolve,reject)=>fn({...options,success:resolve,fail:reject}));}
function imageType(base64){if(base64.startsWith('/9j/'))return 'jpeg';if(base64.startsWith('iVBORw0KGgo'))return 'png';if(base64.startsWith('UklGR'))return 'webp';return null;}
Page({
 data:{rooms:[],selected:null,loading:false,busy:false,photoBusy:false,error:'',editing:false,isEdit:false,form:{id:'',number:'',capacity:'',location:'',equipment:'',open:'08:00—22:00',photo:'',photoNote:''},dateOptions:[],startDateIndex:0,endDateIndex:0,startDateLabel:'',endDateLabel:'',startIndex:0,endIndex:167,startOptions:times.slice(0,-1),endOptions:times.slice(1),start:'08:00',end:'22:00',reason:'',preview:null},
 onShow(){this.load();},
 async onPullDownRefresh(){try{await this.load();}finally{wx.stopPullDownRefresh();}},
 async load(){this.setData({loading:true,error:''});try{const result=await api.call('admin.rooms');const dateOptions=dates.options(result.bookingWindow.first);const rooms=result.rooms.map(room=>({...room,blockCount:room.blocks.filter(x=>x.canRelease).length}));const selected=rooms.find(x=>this.data.selected&&x.id===this.data.selected.id)||null;this.setData({rooms,selected,loading:false,dateOptions});if(!this.startDate||!dateOptions.some(x=>x.date===this.startDate))this.resetDates();}catch(e){this.setData({rooms:[],selected:null});api.error(this,e);}},
 resetDates(){const first=this.data.dateOptions[0];if(!first)return;this.startDate=first.date;this.endDate=first.date;this.setData({startDateIndex:0,endDateIndex:0,startDateLabel:first.label,endDateLabel:first.label,preview:null});},
 newRoom(){if(this.data.busy)return;this.setData({selected:null,editing:true,isEdit:false,error:'',form:{id:'',number:'',capacity:'',location:'',equipment:'',open:'08:00—22:00',photo:'',photoNote:''}});wx.pageScrollTo({selector:'#room-editor',duration:200});},
 editRoom(){if(!this.data.selected||this.data.busy)return;const room=this.data.selected;this.setData({editing:true,isEdit:true,error:'',form:{id:room.id,number:room.number,capacity:String(room.capacity||''),location:room.location||'',equipment:room.equipment||'',open:room.open||'08:00—22:00',photo:room.photo||'',photoNote:room.photoNote||''}});wx.pageScrollTo({selector:'#room-editor',duration:200});},
 cancelEdit(){this.setData({editing:false,isEdit:false,error:''});},
 roomField(e){const field=e.detail.field;this.setData({['form.'+field]:e.detail.value,error:''});},
 async choosePhoto(){
  if(this.data.busy||this.data.photoBusy)return;
  let path='';
  try{
    if(wx.chooseMedia){const result=await invoke(options=>wx.chooseMedia(options),{count:1,mediaType:['image'],sizeType:['compressed'],sourceType:['album','camera']});path=result.tempFiles&&result.tempFiles[0]&&result.tempFiles[0].tempFilePath;}
    else{const result=await invoke(options=>wx.chooseImage(options),{count:1,sizeType:['compressed'],sourceType:['album','camera']});path=result.tempFilePaths&&result.tempFilePaths[0];}
  }catch(e){return;}
  if(!path)return;
  this.setData({photoBusy:true,error:''});
  try{
    let file=path;
    try{const compressed=await invoke(options=>wx.compressImage(options),{src:path,quality:70,compressedWidth:900});if(compressed.tempFilePath)file=compressed.tempFilePath;}catch(e){}
    const base64=(await invoke(options=>wx.getFileSystemManager().readFile(options),{filePath:file,encoding:'base64'})).data;
    const type=imageType(base64);
    if(!type)throw new Error('请选择 JPG、PNG 或 WebP 格式的图片');
    const dataUrl='data:image/'+type+';base64,'+base64;
    if(dataUrl.length>PHOTO_MAX)throw new Error('图片过大，请重新选择更小的图片');
    this.setData({'form.photo':dataUrl});
  }catch(e){this.setData({error:e.message||'图片读取失败，请重新选择'});}
  finally{this.setData({photoBusy:false});}
 },
 removePhoto(){if(this.data.busy||this.data.photoBusy)return;this.setData({'form.photo':'',error:''});},
 async saveRoom(){
  if(this.data.busy||this.data.photoBusy)return;
  const form=this.data.form,isEdit=this.data.isEdit,id=(form.id||'').trim();
  if(!id||!form.capacity||!form.location||!form.equipment){this.setData({error:'请填写编号、容量、位置和设备'});return;}
  const payload={number:(form.number||'').trim()||id,capacity:Number(form.capacity),location:form.location,equipment:form.equipment,open:form.open,photo:form.photo,photoNote:form.photoNote};
  this.setData({busy:true,error:''});
  try{
   const room=isEdit?await api.call('admin.roomUpdate',{roomId:id,...payload}):await api.call('admin.roomCreate',{id,...payload});
   this.setData({editing:false,isEdit:false,selected:room});
   await this.load();
   wx.showToast({title:isEdit?'已保存':'已新增',icon:'success'});
  }catch(e){api.error(this,e);}finally{this.setData({busy:false});}
 },
 async deleteRoom(){if(!this.data.selected||this.data.busy)return;const room=this.data.selected;const modal=await wx.showModal({title:'删除会议室',content:'删除后不可恢复。已有预约或停用记录的会议室不能删除。',confirmText:'删除',confirmColor:'#cf4848'});if(!modal.confirm)return;this.setData({busy:true,error:''});try{await api.call('admin.roomDelete',{roomId:room.id});this.setData({selected:null,editing:false});await this.load();wx.showToast({title:'已删除',icon:'success'});}catch(e){api.error(this,e);}finally{this.setData({busy:false});}},
 select(e){if(this.data.busy)return;const selected=this.data.rooms.find(item=>item.id===e.currentTarget.dataset.id);if(!selected)return;this.setData({selected,editing:false,isEdit:false,reason:'',preview:null,error:'',start:'08:00',end:'22:00',startIndex:0,endIndex:167});this.resetDates();wx.pageScrollTo({selector:'#manage-form',duration:200});},
 field(e){this.setData({reason:e.detail.value,preview:null,error:''});},
 changeDate(e){const field=e.currentTarget.dataset.field,index=Number(e.detail.value),option=this.data.dateOptions[index];if(!['startDate','endDate'].includes(field)||!option||this.data.busy)return;this[field]=option.date;this.setData({[field+'Index']:index,[field+'Label']:option.label,preview:null,error:''});},
 changeTime(e){const field=e.currentTarget.dataset.field,index=Number(e.detail.value),value=this.data[field+'Options']&&this.data[field+'Options'][index];if(!['start','end'].includes(field)||!value||this.data.busy)return;this.setData({[field]:value,[field+'Index']:index,preview:null,error:''});},
 payload(){return {roomId:this.data.selected.id,startDate:this.startDate,endDate:this.endDate,start:this.data.start,end:this.data.end,reason:this.data.reason};},
 async preview(){if(this.data.busy||!this.data.selected)return;if(!this.data.reason.trim()){this.setData({error:'请填写停用原因'});return;}this.setData({busy:true,error:'',preview:null});try{const payload=this.payload(),preview=await api.call('admin.roomBlockPreview',payload);this.pending={...payload,previewVersion:preview.previewVersion,requestId:'block-'+Date.now()+'-'+Math.random().toString(36).slice(2)};this.setData({preview});}catch(e){api.error(this,e);}finally{this.setData({busy:false});}},
 async confirm(){if(this.data.busy||!this.data.preview||!this.pending)return;this.setData({busy:true,error:''});try{const modal=await wx.showModal({title:'确认停用会议室',content:'将取消 '+this.data.preview.affected.length+' 条受影响预约，并发送站内通知。解除停用不会恢复原预约。',confirmText:'确认停用',confirmColor:'#cf4848'});if(!modal.confirm)return;await api.call('admin.roomBlockCreate',this.pending);this.setData({preview:null,reason:''});this.pending=null;await this.load();wx.showToast({title:'停用已生效',icon:'success'});}catch(e){if(e.code==='PREVIEW_CHANGED'){this.setData({preview:null});this.pending=null;}api.error(this,e);}finally{this.setData({busy:false});}},
 async release(e){if(this.data.busy)return;const id=e.currentTarget.dataset.id;this.setData({busy:true,error:''});try{const modal=await wx.showModal({title:'解除停用',content:'解除后可重新预约，已取消的预约不会恢复。',editable:true,placeholderText:'请输入恢复原因',confirmText:'解除停用'});if(!modal.confirm)return;const reason=(modal.content||'').trim();if(!reason){this.setData({error:'请填写恢复原因'});return;}await api.call('admin.roomBlockRelease',{id,reason});this.setData({preview:null});await this.load();wx.showToast({title:'已解除停用',icon:'success'});}catch(e){api.error(this,e);}finally{this.setData({busy:false});}}
});
