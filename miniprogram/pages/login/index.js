const api = require('../../utils/api');
const navigation = require('../../utils/login-navigation');

Page({
  data: { submitting: false, error: '', account: '', password: '', accountError: '', passwordError: '' },
  onLoad(query) { this.destination = navigation.destination(query); if (query && query.reason === 'expired') this.setData({ error: '登录已失效，请重新登录。' }); },
  onShow() { this.setData({ submitting: false }); },
  field(e) { const field = e.currentTarget.dataset.field; this.setData({ [field]: e.detail.value, [field + 'Error']: '', error: '' }); },
  blur(e) { this.validateField(e.currentTarget.dataset.field, this.data[e.currentTarget.dataset.field]); },
  validateField(field, value) { const message = String(value || '').trim() ? '' : field === 'account' ? '请输入账号' : '请输入密码'; this.setData({ [field + 'Error']: message }); return !message; },
  async submit() {
    if (this.data.submitting) return;
    const valid = ['account', 'password'].map(field => this.validateField(field, this.data[field])).every(Boolean);
    if (!valid) return;
    this.setData({ submitting: true, error: '' });
    try { await api.login(this.data.account.trim(), this.data.password); navigation.finish(this.destination || '/pages/home/index'); }
    catch (error) { this.setData({ error: error.message || '登录失败，请检查账号和密码。' }); }
    finally { this.setData({ submitting: false }); }
  },
  // 保留旧入口事件，兼容历史页面脚本；当前页面按钮直接提交账号密码。
  login() {
    if (!this.data.account && !this.data.password) {
      wx.navigateTo({ url: '/pages/account-select/index?redirect=' + encodeURIComponent(this.destination || '/pages/home/index') });
      return;
    }
    return this.submit();
  }
});
