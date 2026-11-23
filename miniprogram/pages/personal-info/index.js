const api = require('../../utils/api');
const avatar=require('../../utils/avatar');
const statusLabels = { unsubmitted: '未提交核验', pending: '待审核', approved: '已通过核验', rejected: '未通过核验' };
Page({
  data: { user: null, profile: null, loading: false, error: '', statusText: '',avatarBusy:false },
  onShow() { this.unloaded=false;this.load(); },
  onUnload(){this.unloaded=true;},
  chooseAvatar(e){return avatar.change(this,e);},
  async load() {
    this.setData({ loading: true, error: '', user: null, profile: null });
    try {
      const { user, identityHistory } = await api.me();
      const latest = identityHistory[0];
      const profile = user.verification === 'approved' ? user : latest ? latest.profile : user;
      this.setData({ user, profile, statusText: statusLabels[user.verification] || '待核验', loading: false });
    } catch (e) { api.error(this, e); }
  },
  identity() { wx.navigateTo({ url: '/pages/identity/index' }); },
  login() { wx.navigateTo({ url: '/pages/login/index' }); }
});
