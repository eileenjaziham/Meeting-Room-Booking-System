const api = require('../../utils/api');
const dates = require('../../utils/date');
const availability = require('../../utils/availability');
Page({
  data: { roomId:'', date:'', dateLabel:'', start:'', end:'', purpose:'', responsibleTeacher:'', borrowerName:'', attendees:'', phone:'', notes:'', user:null, loading:true, ready:false, busy:false, error:'', capacity:null, occupied:[], slotConflict:false,fieldErrors:{},focusField:'' },
  onLoad(query) {
    this.unloaded=false;
    if(!query||!query.roomId||!query.date||!query.start||!query.end){this.update({loading:false,error:'预约信息不完整，请重新选择会议室与时间。'});return;}
    this.update({roomId:query.roomId,date:query.date,dateLabel:dates.label(query.date),start:query.start,end:query.end});
    return this.load();
  },
  onUnload() { this.unloaded=true; },
  update(values) { if(!this.unloaded)this.setData(values); },
  async load() {
    this.update({loading:true,ready:false,error:''});
    try {
      const {user}=await api.me(); if(this.unloaded)return;
      this.update({user});
      const room=await api.call('rooms.detail',{roomId:this.data.roomId,date:this.data.date});if(this.unloaded)return;
      this.update({phone:this.data.phone||user.phone,borrowerName:this.data.borrowerName||user.name,responsibleTeacher:this.data.responsibleTeacher||(user.identityType==='teacher'?user.name:''),capacity:room.capacity,ready:true});
      this.restore();
      this.availability(room);
    } catch(e) { if(e.code!=='UNAUTHENTICATED')this.update({error:e.message||'资料加载失败，请重试'}); }
    finally { this.update({loading:false}); }
  },
  field(e) { const key=e.detail.field||e.currentTarget.dataset.field;if(!['purpose','responsibleTeacher','borrowerName','attendees','phone','notes'].includes(key))return;this.update({[key]:String(e.detail.value),fieldErrors:{...this.data.fieldErrors,[key]:''},error:''});this.saveDraft(); },
  fieldMessage(key,value){
    const labels={responsibleTeacher:'负责老师',borrowerName:'借用人',purpose:'使用用途'};
    if(labels[key]&&!String(value||'').trim())return '请填写'+labels[key];
    if(key==='attendees'){const count=Number(value);if(!Number.isSafeInteger(count)||count<=0)return '预计人数须为正整数';if(this.data.capacity!==null&&count>this.data.capacity)return '人数超过会议室容量 '+this.data.capacity+' 人';}
    if(key==='phone'&&!/^1[3-9]\d{9}$/.test(value))return '请填写中国大陆11位手机号';return '';
  },
  blur(e){const key=e.detail.field;if(!key)return;this.update({fieldErrors:{...this.data.fieldErrors,[key]:this.fieldMessage(key,e.detail.value)},focusField:this.data.focusField===key?'':this.data.focusField});},
  reportField(key,message){this.update({fieldErrors:{...this.data.fieldErrors,[key]:message},focusField:key,error:message});},
  payload() { const d=this.data;return {roomId:d.roomId,date:d.date,start:d.start,end:d.end,purpose:d.purpose,responsibleTeacher:d.responsibleTeacher,borrowerName:d.borrowerName,attendees:Number(d.attendees),phone:d.phone,notes:d.notes}; },
  saveDraft() { if(this.data.user)wx.setStorageSync('bookingDraft:'+this.data.user.id,this.payload()); },
  sameSlot(p) { return p&&['roomId','date','start','end'].every(key=>p[key]===this.data[key]); },
  restore() {
    const user=this.data.user;if(!user)return;
    const pending=wx.getStorageSync('pendingSubmission');
    const draft=pending&&pending.userId===user.id&&this.sameSlot(pending.payload)?pending.payload:wx.getStorageSync('bookingDraft:'+user.id);
    if(this.sameSlot(draft))this.update({purpose:draft.purpose||'',responsibleTeacher:draft.responsibleTeacher||'',borrowerName:draft.borrowerName||user.name,attendees:draft.attendees?String(draft.attendees):'',phone:draft.phone||user.phone,notes:draft.notes||''});
  },
  login() { this.saveDraft();api.requireLogin(); },
  availability(room) {
    const conflict=availability.overlap(room.occupied,this.data.start,this.data.end);
    this.update({occupied:room.occupied,slotConflict:!!conflict});
    return conflict;
  },
  changeTime() { this.saveDraft();wx.redirectTo({url:'/pages/room/index?id='+this.data.roomId+'&date='+this.data.date}); },
  async submit() {
    if(this.data.busy)return;
    if(!this.data.user){this.login();return;}
    if(!this.data.ready){await this.load();if(!this.data.ready)return;}
    const payload=this.payload();
    for(const key of ['responsibleTeacher','borrowerName','purpose','attendees','phone']){const message=this.fieldMessage(key,payload[key]);if(message){this.reportField(key,message);return;}}
    const old=wx.getStorageSync('pendingSubmission');
    const same=old&&old.userId===this.data.user.id&&JSON.stringify(old.payload)===JSON.stringify(payload);
    const requestId=same?old.requestId:'mp-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    this.saveDraft();wx.setStorageSync('pendingSubmission',{userId:this.data.user.id,payload,requestId});this.update({busy:true,error:''});
    try {
      // 重试同一请求时交给服务器幂等处理，避免把已成功但响应丢失的本人预约误判为冲突。
      if(!same){
        const room=await api.call('rooms.detail',{roomId:payload.roomId,date:payload.date});
        const conflict=this.availability(room);
        if(conflict){this.update({error:availability.message(conflict)});wx.removeStorageSync('pendingSubmission');return;}
      }
      const result=await api.call('reservation.create',{...payload,requestId});
      wx.removeStorageSync('pendingSubmission');wx.removeStorageSync('bookingDraft:'+this.data.user.id);
      if(!this.unloaded)wx.redirectTo({url:'/pages/result/index?id='+result.id});
    } catch(e) {
      if(e.code!=='UNAUTHENTICATED')this.update({error:e.message||'提交失败，请重试'});
      if(['CONFLICT','ROOM_UNAVAILABLE'].includes(e.code)){
        wx.removeStorageSync('pendingSubmission');
        try{this.availability(await api.call('rooms.detail',{roomId:payload.roomId,date:payload.date}));}catch(refreshError){/* 保留服务器返回的冲突信息，允许再次重试。 */}
      }
    }
    finally { this.update({busy:false}); }
  }
});
