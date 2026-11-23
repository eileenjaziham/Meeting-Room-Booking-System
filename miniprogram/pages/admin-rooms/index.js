const api=require('../../utils/api');
const dates=require('../../utils/date');
const times=Array.from({length:169},(_,i)=>String(8+Math.floor(i*5/60)).padStart(2,'0')+':'+String(i*5%60).padStart(2,'0'));
Page({
 data:{rooms:[],selected:null,loading:false,busy:false,error:'',dateOptions:[],startDateIndex:0,endDateIndex:0,startDateLabel:'',endDateLabel:'',startIndex:0,endIndex:167,startOptions:times.slice(0,-1),endOptions:times.slice(1),start:'08:00',end:'22:00',reason:'',preview:null},
 onShow(){this.load();},
 async onPullDownRefresh(){try{await this.load();}finally{wx.stopPullDownRefresh();}},
 async load(){
  this.setData({loading:true,error:''});
  try{const result=await api.call('admin.rooms');const dateOptions=dates.options(result.bookingWindow.first);const rooms=result.rooms.map(room=>({...room,blockCount:room.blocks.filter(x=>x.canRelease).length}));const selected=rooms.find(x=>this.data.selected&&x.id===this.data.selected.id)||null;
   this.setData({rooms,selected,dateOptions,loading:false});if(!this.startDate||!dateOptions.some(x=>x.date===this.startDate))this.resetDates();
  }catch(e){this.setData({rooms:[],selected:null});api.error(this,e);}
 },
 resetDates(){const first=this.data.dateOptions[0];if(!first)return;this.startDate=first.date;this.endDate=first.date;this.setData({startDateIndex:0,endDateIndex:0,startDateLabel:first.label,endDateLabel:first.label,preview:null});},
 select(e){if(this.data.busy)return;const selected=this.data.rooms.find(x=>x.id===e.currentTarget.dataset.id);if(!selected)return;this.setData({selected,reason:'',preview:null,error:'',start:'08:00',end:'22:00',startIndex:0,endIndex:167});this.resetDates();wx.pageScrollTo({selector:'#manage-form',duration:200});},
 field(e){this.setData({reason:e.detail.value,preview:null,error:''});},
 changeDate(e){const field=e.currentTarget.dataset.field,index=Number(e.detail.value),option=this.data.dateOptions[index];if(!['startDate','endDate'].includes(field)||!option||this.data.busy)return;this[field]=option.date;this.setData({[field+'Index']:index,[field+'Label']:option.label,preview:null,error:''});},
 changeTime(e){const field=e.currentTarget.dataset.field,index=Number(e.detail.value),value=this.data[field+'Options']&&this.data[field+'Options'][index];if(!['start','end'].includes(field)||!value||this.data.busy)return;this.setData({[field]:value,[field+'Index']:index,preview:null,error:''});},
 payload(){return {roomId:this.data.selected.id,startDate:this.startDate,endDate:this.endDate,start:this.data.start,end:this.data.end,reason:this.data.reason};},
 async preview(){if(this.data.busy||!this.data.selected)return;if(!this.data.reason.trim()){this.setData({error:'请填写停用原因'});return;}this.setData({busy:true,error:'',preview:null});
  try{const payload=this.payload(),preview=await api.call('admin.roomBlockPreview',payload);this.pending={...payload,previewVersion:preview.previewVersion,requestId:'block-'+Date.now()+'-'+Math.random().toString(36).slice(2)};this.setData({preview});}catch(e){api.error(this,e);}finally{this.setData({busy:false});}
 },
 async confirm(){if(this.data.busy||!this.data.preview||!this.pending)return;
  this.setData({busy:true,error:''});try{const modal=await wx.showModal({title:'确认停用会议室',content:'将取消 '+this.data.preview.affected.length+' 条受影响预约，并发送站内通知。解除停用不会恢复原预约。',confirmText:'确认停用',confirmColor:'#cf4848'});if(!modal.confirm)return;
   await api.call('admin.roomBlockCreate',this.pending);this.setData({preview:null,reason:''});this.pending=null;await this.load();wx.showToast({title:'停用已生效',icon:'success'});
  }catch(e){if(e.code==='PREVIEW_CHANGED'){this.setData({preview:null});this.pending=null;}api.error(this,e);}finally{this.setData({busy:false});}
 },
 async release(e){if(this.data.busy)return;const id=e.currentTarget.dataset.id;this.setData({busy:true,error:''});
  try{const modal=await wx.showModal({title:'解除停用',content:'解除后可重新预约，已取消的预约不会恢复。',editable:true,placeholderText:'请输入恢复原因',confirmText:'解除停用'});if(!modal.confirm)return;const reason=(modal.content||'').trim();if(!reason){this.setData({error:'请填写恢复原因'});return;}await api.call('admin.roomBlockRelease',{id,reason});this.setData({preview:null});await this.load();wx.showToast({title:'已解除停用',icon:'success'});}catch(e){api.error(this,e);}finally{this.setData({busy:false});}
 }
});
