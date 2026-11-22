const api = require('../../utils/api');
const dates = require('../../utils/date');
const bookingPolicy = require('../../booking-policy');
Page({
  data: { date: dates.today(), dateLabel: dates.label(dates.today()), firstDate: dates.today(), lastDate: dates.addDays(dates.today(), bookingPolicy.maxAdvanceDays), rooms: [], loading: false, error: '', user: null, expanded: false, weekdays: ['日','一','二','三','四','五','六'], statusHeight: 24, canPrevMonth: false, canNextMonth: false },
  onLoad() { const info = wx.getWindowInfo(); this.setData({ statusHeight: info.statusBarHeight }); this.setMonth(this.data.date); },
  onShow() { this.load(); },
  async onPullDownRefresh() { try { await this.load(); } finally { wx.stopPullDownRefresh(); } },
  async load() {
    const sequence = this.sequence = (this.sequence || 0) + 1;
    let requestedDate = this.data.date;
    this.setData({ loading: true, error: '', rooms: [] });
    try {
      const { user, bookingWindow } = await api.me();
      if (sequence !== this.sequence) return;
      const window = bookingWindow || {first:dates.today(),last:dates.addDays(dates.today(),bookingPolicy.maxAdvanceDays)};
      if (requestedDate < window.first || requestedDate > window.last) requestedDate = window.first;
      this.setData({ user, date: requestedDate, dateLabel: dates.label(requestedDate), firstDate: window.first, lastDate: window.last });
      this.setMonth(requestedDate);
      if (user.verification !== 'approved') { this.setData({ loading: false }); return; }
      const rooms = await api.call('rooms.list', { date: requestedDate });
      if (sequence === this.sequence) this.setData({ rooms, loading: false });
    } catch (e) { if (sequence === this.sequence) { if(e.code==='UNAUTHENTICATED')this.setData({user:null}); api.error(this, e); } }
  },
  setMonth(day) { const [year,month] = day.split('-').map(Number); this.setData({ year, month }); this.rebuild(); },
  rebuild() {
    const all = dates.calendar(this.data.year, this.data.month, this.data.date, this.data.firstDate);
    const index = all.findIndex(x=>x.selected);
    let start = Math.max(0, Math.floor(Math.max(0,index)/7)*7);
    if (start+14>all.length) start=Math.max(0,start-7);
    const month = this.data.year + '-' + dates.pad(this.data.month);
    this.setData({ days: this.data.expanded ? all : all.slice(start,start+14), canPrevMonth: month > this.data.firstDate.slice(0,7), canNextMonth: month < this.data.lastDate.slice(0,7) });
  },
  shiftMonth(e) { const step=Number(e.currentTarget.dataset.step); if(step<0&&!this.data.canPrevMonth||step>0&&!this.data.canNextMonth)return; const d = new Date(Date.UTC(this.data.year,this.data.month-1+step,1)); this.setData({year:d.getUTCFullYear(),month:d.getUTCMonth()+1}); this.rebuild(); },
  selectDate(e) { const date=e.currentTarget.dataset.date; if(!date)return;if(date<this.data.firstDate||date>this.data.lastDate){wx.showToast({title:'仅可预约含今天在内的7天，超出范围请联系曹闯老师',icon:'none'});return;} this.setData({date,dateLabel:dates.label(date)});this.rebuild();return this.load(); },
  toggleCalendar() { this.setData({expanded:!this.data.expanded}); this.rebuild(); },
  today() { this.setData({date:this.data.firstDate,dateLabel:dates.label(this.data.firstDate)}); this.setMonth(this.data.date); this.load(); },
  openRoom(e) { wx.navigateTo({url:'/pages/room/index?id='+e.currentTarget.dataset.id+'&date='+this.data.date}); },
  login() { wx.navigateTo({url:'/pages/login/index'}); },
  identity() { wx.navigateTo({url:'/pages/identity/index'}); },
  bookings() { wx.navigateTo({url:'/pages/reservations/index'}); },
  notices() { wx.navigateTo({url:'/pages/notices/index'}); }
});
