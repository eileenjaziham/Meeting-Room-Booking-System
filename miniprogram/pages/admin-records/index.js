const api = require('../../utils/api');
Page({
  data: {
    records: [], loading: false, error: '', status: '', date: '', applicant: '', roomId: '',
    // 会议室选项来自 admin.rooms：新增或改名后，台账筛选自动跟上。roomLabels 与 roomValues 一一对应。
    roomLabels: ['全部会议室'], roomValues: [''], roomIndex: 0,
    filters: [{ value: '', label: '全部' }, { value: 'pending', label: '待确认' }, { value: 'approved', label: '已通过' }, { value: 'rejected', label: '已拒绝' }, { value: 'cancelled', label: '已取消' }, { value: 'expired', label: '已失效' }, { value: 'completed', label: '已完成' }]
  },
  onLoad(q) { this.setData({ status: q.status || '' }); },
  onShow() { this.loadRooms(); this.load(); },
  async loadRooms() {
    try {
      const result = await api.call('admin.rooms');
      const rooms = result.rooms || [];
      const roomLabels = ['全部会议室'].concat(rooms.map(room => room.number + ' 会议室'));
      const roomValues = [''].concat(rooms.map(room => room.id));
      const roomIndex = Math.max(0, roomValues.indexOf(this.data.roomId));
      this.setData({ roomLabels, roomValues, roomIndex, roomId: roomValues[roomIndex] });
    } catch (e) { /* 读不到房间列表不影响台账查询，保留“全部会议室”一档。 */ }
  },
  async load() {
    const seq = this.seq = (this.seq || 0) + 1;
    this.setData({ loading: true, error: '', records: [] });
    try {
      const records = await api.call('admin.reservations', { status: this.data.status, date: this.data.date, roomId: this.data.roomId, applicant: this.data.applicant });
      if (seq === this.seq) this.setData({ records, loading: false });
    } catch (e) { if (seq === this.seq) api.error(this, e); }
  },
  filter(e) { this.setData({ status: e.currentTarget.dataset.value }); this.load(); },
  date(e) { this.setData({ date: e.detail.value }); this.load(); },
  room(e) {
    const index = Number(e.detail.value);
    const roomId = this.data.roomValues[index];
    if (roomId === undefined) return;
    this.setData({ roomIndex: index, roomId });
    this.load();
  },
  applicant(e) { this.setData({ applicant: e.detail.value }); },
  clear() { this.setData({ status: '', date: '', roomId: '', roomIndex: 0, applicant: '' }); this.load(); },
  open(e) { wx.navigateTo({ url: '/pages/reservation/index?admin=1&id=' + e.detail.id }); }
});
