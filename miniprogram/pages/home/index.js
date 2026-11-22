const api = require('../../utils/api');
const dates = require('../../utils/date');
Page({
  data: { date: dates.today(), rooms: [], loading: false, error: '', user: null, expanded: false, weekdays: ['日','一','二','三','四','五','六'], statusHeight: 24 },
  onLoad() { const info = wx.getWindowInfo(); this.setData({ statusHeight: info.statusBarHeight }); this.setMonth(this.data.date); },
  onShow() { this.load(); },
  async onPullDownRefresh() { try { await this.load(); } finally { wx.stopPullDownRefresh(); } },
  async load() {
    const requestedDate = this.data.date;
    this.setData({ loading: true, error: '', rooms: [] });
    try {
      const { user } = await api.me();
      this.setData({ user });
      if (user.verification !== 'approved') { this.setData({ loading: false }); return; }
      const rooms = await api.call('rooms.list', { date: requestedDate });
      if (this.data.date === requestedDate) this.setData({ rooms, loading: false });
    } catch (e) { if (this.data.date === requestedDate) { if(e.code==='UNAUTHENTICATED')this.setData({user:null}); api.error(this, e); } }
  },
  setMonth(day) { const [year,month] = day.split('-').map(Number); this.setData({ year, month }); this.rebuild(); },
  rebuild() {
    const all = dates.calendar(this.data.year, this.data.month, this.data.date);
    const index = all.findIndex(x=>x.selected);
    let start = Math.max(0, Math.floor(Math.max(0,index)/7)*7);
    if (start+14>all.length) start=Math.max(0,start-7);
    this.setData({ days: this.data.expanded ? all : all.slice(start,start+14) });
  },
  shiftMonth(e) { const d = new Date(Date.UTC(this.data.year,this.data.month-1+Number(e.currentTarget.dataset.step),1)); this.setData({year:d.getUTCFullYear(),month:d.getUTCMonth()+1}); this.rebuild(); },
  selectDate(e) { if (!e.currentTarget.dataset.date) return; this.setData({date:e.currentTarget.dataset.date}); this.rebuild(); this.load(); },
  toggleCalendar() { this.setData({expanded:!this.data.expanded}); this.rebuild(); },
  today() { this.setData({date:dates.today()}); this.setMonth(this.data.date); this.load(); },
  openRoom(e) { wx.navigateTo({url:'/pages/room/index?id='+e.currentTarget.dataset.id+'&date='+this.data.date}); },
  login() { wx.navigateTo({url:'/pages/login/index'}); },
  identity() { wx.navigateTo({url:'/pages/identity/index'}); },
  bookings() { wx.navigateTo({url:'/pages/reservations/index'}); },
  notices() { wx.navigateTo({url:'/pages/notices/index'}); }
});
