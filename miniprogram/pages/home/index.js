const api = require('../../utils/api');
const dates = require('../../utils/date');
const bookingPolicy = require('../../booking-policy');
Page({
  data: { date: dates.today(), dateLabel: dates.label(dates.today()), firstDate: dates.today(), lastDate: dates.addDays(dates.today(), bookingPolicy.maxAdvanceDays), rooms: [], loading: false, error: '', user: null, adminStats:null,adminError:'',bookingDates:{},unreadCount:0, expanded: false, weekdays: ['日','一','二','三','四','五','六'], statusHeight: 24, canPrevMonth: false, canNextMonth: false },
  onLoad() { const info = wx.getWindowInfo(); this.setData({ statusHeight: info.statusBarHeight }); this.setMonth(this.data.date); },
  onShow() { this.visible=true;this.startReminderPolling();return this.load(); },
  onHide(){this.visible=false;this.stopReminderPolling();},
  onUnload(){this.visible=false;this.sequence=(this.sequence||0)+1;this.stopReminderPolling();},
  startReminderPolling(){this.stopReminderPolling();if(typeof setInterval==='function')this.reminderTimer=setInterval(()=>this.refreshReminders(),30000);},
  stopReminderPolling(){if(this.reminderTimer!==undefined&&typeof clearInterval==='function')clearInterval(this.reminderTimer);this.reminderTimer=undefined;},
  async refreshReminders(){
    if(!this.visible||this.reminderBusy||this.data.loading||!this.data.user)return;
    const sequence=this.sequence,userId=this.data.user.id;this.reminderBusy=true;
    try{
      const {user,reminders}=await api.me();
      if(!this.visible||sequence!==this.sequence||user.id!==userId||!this.data.user||this.data.user.id!==userId)return;
      const bookingDates=reminders&&reminders.bookingDates||{},changed=JSON.stringify(bookingDates)!==JSON.stringify(this.data.bookingDates);
      this.setData({bookingDates,unreadCount:reminders&&reminders.unreadCount||0});if(changed)this.rebuild();
      if(user.isAdmin){const adminStats=await api.call('admin.dashboard');if(this.visible&&sequence===this.sequence&&this.data.user&&this.data.user.id===userId)this.setData({adminStats,adminError:''});}
    }catch(e){/* 刷新失败保留上次提醒；离开页面或登录过期由已有会话流程处理。 */}
    finally{this.reminderBusy=false;}
  },
  async onPullDownRefresh() { try { await this.load(); } finally { wx.stopPullDownRefresh(); } },
  async load() {
    const sequence = this.sequence = (this.sequence || 0) + 1;
    let requestedDate = this.data.date;
    this.setData({ loading: true, error: '', rooms: [],adminStats:null,adminError:'',bookingDates:{},unreadCount:0 });
    try {
      const { user, bookingWindow,reminders } = await api.me();
      if (sequence !== this.sequence) return;
      const window = bookingWindow || {first:dates.today(),last:dates.addDays(dates.today(),bookingPolicy.maxAdvanceDays)};
      if (requestedDate < window.first || requestedDate > window.last) requestedDate = window.first;
      this.setData({ user, date: requestedDate, dateLabel: dates.label(requestedDate), firstDate: window.first, lastDate: window.last,bookingDates:reminders&&reminders.bookingDates||{},unreadCount:reminders&&reminders.unreadCount||0 });
      this.setMonth(requestedDate);
      const [schedule,dashboard]=await Promise.allSettled([
        !user.isAdmin&&user.verification==='approved'?api.call('rooms.list',{date:requestedDate}):Promise.resolve([]),
        user.isAdmin?api.call('admin.dashboard'):Promise.resolve(null)
      ]);
      if(sequence!==this.sequence)return;
      for(const result of [schedule,dashboard])if(result.status==='rejected'&&result.reason.code==='UNAUTHENTICATED')throw result.reason;
      this.setData({rooms:schedule.status==='fulfilled'?schedule.value:[],error:schedule.status==='rejected'?schedule.reason.message:'',adminStats:dashboard.status==='fulfilled'?dashboard.value:null,adminError:dashboard.status==='rejected'?dashboard.reason.message:'',loading:false});
    } catch (e) { if (sequence === this.sequence) { if(e.code==='UNAUTHENTICATED')this.setData({user:null}); api.error(this, e); } }
  },
  setMonth(day) { const [year,month] = day.split('-').map(Number); this.setData({ year, month }); this.rebuild(); },
  rebuild() {
    const all = dates.calendar(this.data.year, this.data.month, this.data.date, this.data.firstDate).map(day=>({...day,bookingCount:this.data.bookingDates[day.date]||0}));
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
  openRoom(e) { const id=e.detail&&e.detail.id||e.currentTarget.dataset.id;wx.navigateTo({url:'/pages/room/index?id='+id+'&date='+this.data.date}); },
  login() { wx.navigateTo({url:'/pages/login/index'}); },
  identity() { wx.navigateTo({url:'/pages/identity/index'}); },
  bookings() { wx.navigateTo({url:'/pages/reservations/index'}); },
  openAdmin(url){if(this.data.user&&this.data.user.isAdmin)wx.navigateTo({url});},
  reviewBookings(){this.openAdmin('/pages/admin-records/index?status=pending');},
  ledger(){this.openAdmin('/pages/admin-records/index');},
  reviewUsers(){this.openAdmin('/pages/admin-identities/index');},
  reviewFeedback(){this.openAdmin('/pages/admin-feedback/index');},
  manageRooms(){this.openAdmin('/pages/admin-rooms/index');},
  notices() { wx.navigateTo({url:'/pages/notices/index'}); }
});
