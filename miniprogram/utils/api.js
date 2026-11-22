const config = require('../config');
function http(path, data) {
  return new Promise((resolve,reject) => wx.request({ url: config.baseUrl + path, method: 'POST', data, header: { Authorization: 'Bearer ' + (wx.getStorageSync('token') || '') }, timeout: 12000,
    success(res) { if (res.data && res.data.ok) resolve(res.data.data); else { const e = new Error(res.data && res.data.error ? res.data.error.message : '服务响应异常'); e.code = res.data && res.data.error && res.data.error.code; reject(e); } },
    fail() { reject(new Error('网络连接失败，请确认本地服务已启动，或检查云环境配置')); }
  }));
}
async function call(action, payload = {}) {
  if (config.mode === 'local') return http('/api', { action, payload });
  const { result } = await wx.cloud.callFunction({ name: config.functionName, data: { action, payload } });
  if (!result || !result.ok) { const e = new Error(result && result.error ? result.error.message : '云服务响应异常'); e.code = result && result.error && result.error.code; throw e; }
  return result.data;
}
async function login(account) {
  if (config.mode === 'local') { const data = await http('/dev/login', { account }); wx.setStorageSync('token', data.token); }
  const result = await call('me'); getApp().globalData.user = result.user; return result;
}
async function me() { const data = await call('me'); getApp().globalData.user = data.user; return data; }
function error(page, err) { page.setData({ error: err.message || '请求失败，请重试', loading: false, busy: false }); if (err.code === 'UNAUTHENTICATED') getApp().globalData.user = null; }
module.exports = { call, login, me, error };
