'use strict';
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { demoUsers } = require('./seed');
const { BusinessError } = require('./service');
function createHttpServer(service, { devLogin = false, driver = 'unknown', logger = console } = {}) {
  const sessions = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    try {
      if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, mode: 'local-development', database: driver, devLogin });
      if (req.method !== 'POST' || !['/api','/dev/login'].includes(req.url)) throw new BusinessError('NOT_FOUND', '接口不存在', 404);
      const chunks = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 32768) throw new BusinessError('PAYLOAD_TOO_LARGE', '请求过大', 413); chunks.push(chunk); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new BusinessError('VALIDATION','请求须为 JSON'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BusinessError('VALIDATION','请求须为 JSON 对象');
      if (req.url === '/dev/login') {
        if (!devLogin) throw new BusinessError('FORBIDDEN', '开发登录已关闭', 403);
        const user = demoUsers.find(x => x.id === body.account);
        if (!user) throw new BusinessError('VALIDATION', '测试账号不存在');
        const token = randomBytes(32).toString('hex');
        sessions.set(token, { userId: user.id, expires: Date.now() + 12 * 3600000 });
        return send(200, { ok: true, data: { token, mode: '本地开发 · 虚构测试身份', database: driver } });
      }
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const session = sessions.get(token);
      if (!session || session.expires <= Date.now()) throw new BusinessError('UNAUTHENTICATED', '请重新登录', 401);
      const data = await service.execute(session.userId, body.action, body.payload || {});
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
