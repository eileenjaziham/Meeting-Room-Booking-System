const api = require('../../utils/api');
const { version } = require('../../version');
const avatar=require('../../utils/avatar');
Page({
  data: { user: null, error: '', version,avatarBusy:false,unreadCount:0 },
  onShow() { this.unloaded=false;this.load(); },
  onUnload(){this.unloaded=true;},
  chooseAvatar(e){return avatar.change(this,e);},
  async load() {
    this.setData({ error: '' });
    try { const { user,reminders } = await api.me(); this.setData({ user,unreadCount:reminders&&reminders.unreadCount||0 }); }
    catch (e) { this.setData({ user: null,unreadCount:0 }); api.error(this, e); }
  },
  login() { wx.navigateTo({ url: '/pages/login/index' }); },
  personalInfo() { wx.navigateTo({ url: '/pages/personal-info/index' }); },
  feedback() { wx.navigateTo({ url: '/pages/feedback/index' }); },
  bookings() { wx.navigateTo({ url: '/pages/reservations/index' }); },
  notices() { wx.navigateTo({ url: '/pages/notices/index' }); },
  logout() { api.clearSession(); this.setData({ user: null }); wx.reLaunch({ url: '/pages/login/index' }); }
});
