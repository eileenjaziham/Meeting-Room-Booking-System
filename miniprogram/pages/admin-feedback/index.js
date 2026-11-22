const api = require('../../utils/api');
const stamp = value => new Date(value + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 16);
Page({
  data: { records: [], status: 'pending', filters: [{ value: 'pending', label: '待处理' }, { value: 'replied', label: '已回复' }, { value: '', label: '全部' }], selected: null, reply: '', loading: false, busy: false, error: '' },
  onShow() { this.load(); },
  async load() {
    const sequence = this.sequence = (this.sequence || 0) + 1;
    this.setData({ loading: true, error: '', records: [] });
    try { const records = await api.call('admin.feedback', { status: this.data.status }); if(sequence === this.sequence) this.setData({ records: records.map(x=>({ ...x, createdText: stamp(x.createdAt) })), loading: false }); }
    catch (e) { if(sequence === this.sequence) api.error(this, e); }
  },
  filter(e) { this.setData({ status: e.currentTarget.dataset.value, selected: null }); this.load(); },
  select(e) { this.setData({ selected: this.data.records.find(x=>x.id===e.currentTarget.dataset.id), reply: '' }); },
  reply(e) { this.setData({ reply: e.detail.value }); },
  async submit() {
    if (this.data.busy || !this.data.selected) return;
    if (!this.data.reply.trim()) { this.setData({ error: '请填写回复内容' }); return; }
    this.setData({ busy: true, error: '' });
    try { await api.call('admin.replyFeedback', { id: this.data.selected.id, reply: this.data.reply }); this.setData({ selected: null, reply: '' }); await this.load(); wx.showToast({ title: '已回复' }); }
    catch (e) { api.error(this, e); }
    finally { this.setData({ busy: false }); }
  }
});
