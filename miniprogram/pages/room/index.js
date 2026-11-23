const api = require('../../utils/api');
const dates = require('../../utils/date');
const availability = require('../../utils/availability');
Page({
  data: { room: null, date: dates.today(), dateLabel: dates.label(dates.today()), dateOptions: dates.options(), dateIndex: 0, start: '09:15', end: '11:45', startOptions:[],endOptions:[],startIndex:0,endIndex:0,hasAvailable:false,isToday:false,earliestStart:'', loading: false, error: '' },
  onLoad(query) { this.roomId=query.id;this.setData({date:query.date||dates.today()}); },
  onShow() { this.load(); },
  async load() {
    const sequence=this.sequence=(this.sequence||0)+1;
    this.setData({loading:true,error:'',room:null});
    try {
      const me=await api.me();if(sequence!==this.sequence)return;
      this.serverNow=me.serverNow;this.clockReadAt=Date.now();
      const dateOptions=dates.options(me.bookingWindow?me.bookingWindow.first:dates.today());
      let dateIndex=dateOptions.findIndex(x=>x.date===this.data.date);if(dateIndex<0)dateIndex=0;
      const day=dateOptions[dateIndex].date;
      this.setData({dateOptions,dateIndex,date:day,dateLabel:dates.label(day),isToday:day===dateOptions[0].date});
      const room=await api.call('rooms.detail',{roomId:this.roomId,date:day});
      if(sequence===this.sequence){this.setRoom(room);this.setData({loading:false});}
    } catch(e){if(sequence===this.sequence)api.error(this,e);}
  },
  changeDate(e) { const index=Number(e.detail.value);if(!this.data.dateOptions[index])return;const day=this.data.dateOptions[index].date;this.setData({date:day,dateIndex:index,dateLabel:dates.label(day)});return this.load(); },
  now(){return this.serverNow+(Date.now()-this.clockReadAt);},
  setRoom(room){this.setData({room,...availability.choices(room.occupied,this.data.date,this.now(),this.data.start,this.data.end)});},
  changeTime(e) {
    const field=e.detail.field||e.currentTarget.dataset.field;if(!['start','end'].includes(field)||this.data.loading)return;
    const options=this.data[field+'Options'],index=Number(e.detail.value);
    if(!Number.isInteger(index)||!options[index])return;
    const preferred={start:this.data.start,end:this.data.end,[field]:options[index]};
    this.setData({...availability.choices(this.data.room.occupied,this.data.date,this.now(),preferred.start,preferred.end),error:''});
  },
  async next() {
    const {start,end,date,room}=this.data;if(!room||this.data.loading||!this.data.hasAvailable)return;
    if(start>='22:00'||start<'08:00'||end>'22:00'||end<=start){this.setData({error:'请选择同一天 08:00—22:00 内开始早于结束的时间'});return;}
    this.setData({loading:true,error:''});
    try {
      const fresh=await api.call('rooms.detail',{roomId:room.id,date});
      if(date!==this.data.date||start!==this.data.start||end!==this.data.end)return;
      this.setRoom(fresh);
      const conflict=availability.overlap(fresh.occupied,start,end);
      if(conflict){this.setData({error:availability.message(conflict)});return;}
      if(this.data.start!==start||this.data.end!==end){this.setData({error:'所选时间已不可用，已更新为空闲时间，请重新确认。'});return;}
      wx.navigateTo({url:'/pages/booking/index?roomId='+room.id+'&date='+date+'&start='+start+'&end='+end});
    } catch(e){api.error(this,e);}
    finally {this.setData({loading:false});}
  }
});
