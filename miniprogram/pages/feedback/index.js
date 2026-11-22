const api = require('../../utils/api');
const stamp = value => value ? new Date(value + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 16) : '';
Page({
  data: { user: null, tab: 'submit', categories: [{ value: 'usage', label: '使用问题' }, { value: 'reservation', label: '预约问题' }, { value: 'suggestion', label: '功能建议' }, { value: 'other', label: '其他反馈' }], category: 'usage', content: '', records: [], busy: false, loading: false, error: '', success: '' },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const { user } = await api.me();
      this.setData({ user });
      const draft = wx.getStorageSync('feedbackDraft:' + user.id);
      if (draft && !this.data.content) this.setData({ category: draft.category, content: draft.content });
      const records = await api.call('feedback.mine');
      this.setData({ records: records.map(x => ({ ...x, createdText: stamp(x.createdAt), repliedText: stamp(x.repliedAt) })), loading: false });
    } catch (e) { if(e.code === 'UNAUTHENTICATED') this.setData({ user: null, records: [] }); api.error(this, e); }
  },
  tab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  category(e) { this.setData({ category: e.currentTarget.dataset.value, success: '' }); },
  content(e) { this.setData({ content: e.detail.value, success: '' }); },
  login() { wx.navigateTo({ url: '/pages/login/index' }); },
  async submit() {
    if (this.data.busy || !this.data.user) return;
    const content = this.data.content.trim();
    if (!content) { this.setData({ error: '请填写反馈内容' }); return; }
    const key = 'feedbackDraft:' + this.data.user.id;
    const old = wx.getStorageSync(key);
    const category = this.data.category;
    const requestId = old && old.category === category && old.content === content ? old.requestId : 'feedback-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    wx.setStorageSync(key, { category, content, requestId });
    this.setData({ busy: true, error: '', success: '' });
    try {
      await api.call('feedback.submit', { category, content, requestId });
      wx.removeStorageSync(key);
      this.setData({ content: '', tab: 'mine', success: '反馈已提交，可在此查看处理进度与回复' });
      await this.load();
    } catch (e) { api.error(this, e); }
    finally { this.setData({ busy: false }); }
  }
});
