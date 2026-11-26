const config = require('../config');
let authRedirecting = false;
function clearSession() { wx.removeStorageSync('token'); getApp().globalData.user = null; }
function requireLogin() {
  clearSession();
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const page = pages[pages.length - 1];
  if (page && ['pages/login/index','pages/account-select/index'].includes(page.route)) return;
  if (authRedirecting) return;
  authRedirecting = true;
  const query = Object.keys(page && page.options || {}).map(key=>encodeURIComponent(key)+'='+encodeURIComponent(page.options[key])).join('&');
  const destination = page ? '/' + page.route + (query ? '?' + query : '') : '/pages/home/index';
  const navigate = wx.reLaunch || wx.redirectTo || wx.navigateTo;
  navigate({ url: '/pages/login/index?reason=expired&redirect=' + encodeURIComponent(destination), fail() { authRedirecting = false; } });
}
function http(path, data) {
  return new Promise((resolve,reject) => wx.request({ url: config.baseUrl + path, method: 'POST', data, header: { Authorization: 'Bearer ' + (wx.getStorageSync('token') || '') }, timeout: 12000,
    success(res) { if (res.data && res.data.ok) resolve(res.data.data); else { const e = new Error(res.data && res.data.error ? res.data.error.message : '服务响应异常'); e.code = res.data && res.data.error && res.data.error.code; reject(e); } },
    fail() { reject(new Error('网络连接失败，请确认本地服务已启动，或检查云环境配置')); }
  }));
}
async function call(action, payload = {}) {
  try {
    if (config.mode === 'local') {
      if (!wx.getStorageSync('token')) { const e = new Error('请先登录'); e.code = 'UNAUTHENTICATED'; throw e; }
      return await http('/api', { action, payload });
    }
    const { result } = await wx.cloud.callFunction({ name: config.functionName, data: { action, payload } });
    if (!result || !result.ok) { const e = new Error(result && result.error ? result.error.message : '云服务响应异常'); e.code = result && result.error && result.error.code; throw e; }
    return result.data;
  } catch (e) { if (e.code === 'UNAUTHENTICATED') requireLogin(); throw e; }
}
async function login(account) {
  if (config.mode === 'local') { const data = await http('/dev/login', { account }); wx.setStorageSync('token', data.token); }
  const result = await call('me'); authRedirecting = false; getApp().globalData.user = result.user; return result;
}
async function me() { const data = await call('me'); getApp().globalData.user = data.user; return data; }
function error(page, err) { if (err.code === 'UNAUTHENTICATED' || page.unloaded) return; page.setData({ error: err.message || '请求失败，请重试', loading: false, busy: false }); }
module.exports = { call, login, me, error, clearSession, requireLogin };
