const api = require('../../utils/api');
const dates = require('../../utils/date');
Page({
  data: { room: null, date: dates.today(), dateLabel: dates.label(dates.today()), dateOptions: dates.options(), dateIndex: 0, start: '09:15', end: '11:45', loading: false, error: '' },
  onLoad(query) { this.roomId=query.id;this.setData({date:query.date||dates.today()}); },
  onShow() { this.load(); },
  async load() {
    const sequence=this.sequence=(this.sequence||0)+1;
    this.setData({loading:true,error:'',room:null});
    try {
      const me=await api.me();if(sequence!==this.sequence)return;
      const dateOptions=dates.options(me.bookingWindow?me.bookingWindow.first:dates.today());
      let dateIndex=dateOptions.findIndex(x=>x.date===this.data.date);if(dateIndex<0)dateIndex=0;
      const day=dateOptions[dateIndex].date;
      this.setData({dateOptions,dateIndex,date:day,dateLabel:dates.label(day)});
      const room=await api.call('rooms.detail',{roomId:this.roomId,date:day});
      if(sequence===this.sequence)this.setData({room,loading:false});
    } catch(e){if(sequence===this.sequence)api.error(this,e);}
  },
  changeDate(e) { const index=Number(e.detail.value);if(!this.data.dateOptions[index])return;const day=this.data.dateOptions[index].date;this.setData({date:day,dateIndex:index,dateLabel:dates.label(day)});return this.load(); },
  changeTime(e) { this.setData({[e.currentTarget.dataset.field]:e.detail.value}); },
  next() {
    const {start,end,date,room}=this.data;if(!room||this.data.loading)return;
    if(start>='22:00'||start<'08:00'||end>'22:00'||end<=start){this.setData({error:'请选择同一天 08:00—22:00 内开始早于结束的时间'});return;}
    wx.navigateTo({url:'/pages/booking/index?roomId='+room.id+'&date='+date+'&start='+start+'&end='+end});
  }
});
