const policy = require('../../booking-policy');
Component({ data: { manager: policy.manager }, methods: { copyQQ() { wx.setClipboardData({ data: this.data.manager.qq }); } } });
