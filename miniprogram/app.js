const config = require('./config');
App({
  globalData: { config, user: null },
  onLaunch() {
    if (config.mode === 'cloud') {
      if (!config.envId) throw new Error('请配置 CloudBase 环境 ID');
      wx.cloud.init({ env: config.envId, traceUser: false });
    }
  }
});
