'use strict';
const http = require('node:http');
const { BusinessError } = require('./service');
const { clientAddress } = require('./dev-network');
function createHttpServer(service, { devLogin = false, driver = 'unknown', logger = console,allowedClients } = {}) {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    try {
      if(allowedClients&&!allowedClients.includes(clientAddress(req.socket.remoteAddress)))throw new BusinessError('FORBIDDEN','此设备未加入局域网调试允许列表',403);
      if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, mode: 'local-development', database: driver, devLogin });
      if (req.method !== 'POST' || !['/api','/dev/login'].includes(req.url)) throw new BusinessError('NOT_FOUND', '接口不存在', 404);
      const chunks = []; let bytes = 0;
      // 会议室图片以 base64 数据地址随请求提交，接口体上限放宽到 4MB；登录等其余体量仍保持 96KB。
      const limit = req.url === '/api' ? 4 * 1024 * 1024 : 96 * 1024;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > limit) throw new BusinessError('PAYLOAD_TOO_LARGE', '请求过大', 413); chunks.push(chunk); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new BusinessError('VALIDATION','请求须为 JSON'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BusinessError('VALIDATION','请求须为 JSON 对象');
      if (req.url === '/dev/login') {
        if (!devLogin) throw new BusinessError('FORBIDDEN', '开发登录已关闭', 403);
        const account = await service.devAccount(body.account);
        if (!account) throw new BusinessError('VALIDATION', '测试账号不存在，请先运行 npm run db:init 写入初始数据');
        if (body.password !== undefined && body.password !== account.password) throw new BusinessError('UNAUTHENTICATED', '账号或密码不正确', 401);
        const token = await service.issueSession(account.id);
        return send(200, { ok: true, data: { token, mode: '本地开发 · 虚构测试身份', database: driver } });
      }
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const userId = await service.resolveSession(token);
      if (!userId) throw new BusinessError('UNAUTHENTICATED', '登录已失效，请重新登录', 401);
      const data = await service.execute(userId, body.action, body.payload || {});
      return send(200, { ok: true, data });
    } catch (error) {
      if (!(error instanceof BusinessError)) logger.error('API internal error', error.code || error.name);
      return send(error.status || 500, { ok: false, error: { code: error.code || 'INTERNAL', message: error instanceof BusinessError ? error.message : '服务异常，请稍后重试' } });
    }
  });
  server.requestTimeout = 15000;
  return server;
}
module.exports = { createHttpServer };
