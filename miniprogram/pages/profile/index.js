const api = require('../../utils/api');
const { version } = require('../../version');
Page({
  data: { user: null, error: '', version },
  onShow() { this.load(); },
  async load() {
    this.setData({ error: '' });
    try { const { user } = await api.me(); this.setData({ user }); }
    catch (e) { this.setData({ user: null }); api.error(this, e); }
  },
  login() { wx.navigateTo({ url: '/pages/login/index' }); },
  personalInfo() { wx.navigateTo({ url: '/pages/personal-info/index' }); },
  feedback() { wx.navigateTo({ url: '/pages/feedback/index' }); },
  bookings() { wx.navigateTo({ url: '/pages/reservations/index' }); },
  admin() { wx.navigateTo({ url: '/pages/admin/index' }); },
  notices() { wx.navigateTo({ url: '/pages/notices/index' }); },
  logout() { wx.removeStorageSync('token'); getApp().globalData.user = null; this.setData({ user: null }); wx.navigateTo({ url: '/pages/login/index' }); }
});
