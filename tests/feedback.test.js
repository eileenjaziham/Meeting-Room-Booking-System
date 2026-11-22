const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../server/db');
const { seed } = require('../server/seed');
const { createService } = require('../server/service');
let db, service, sequence = 0;
before(async () => { db = await openDatabase({ driver: 'pglite', path: 'memory://' }); await seed(db, { demo: true }); service = createService(db); });
after(async () => { await db.close(); });
const call = (user, action, payload = {}) => service.execute('demo-' + user, action, payload);
const payload = (changes = {}) => ({ category: 'usage', content: '测试反馈：希望说明预约操作步骤。', requestId: 'feedback-test-' + (++sequence), ...changes });
const reject = (promise, code) => assert.rejects(promise, error => error.code === code);

test('反馈保存到数据库且归属取会话，客户端不能伪造已回复', async () => {
  const result = await call('student', 'feedback.submit', payload({ userId: 'demo-teacher', status: 'replied', reply: '伪造回复' }));
  assert.equal(result.status, 'pending'); assert.equal(result.reply, '');
  const stored = await db.transact(s => s.feedback.find(x => x.id === result.id));
  assert.equal(stored.userId, 'demo-student');
  const mine = await call('student', 'feedback.mine', { userId: 'demo-teacher' });
  const others = await call('teacher', 'feedback.mine', { userId: 'demo-student' });
  assert.ok(mine.some(x => x.id === result.id)); assert.equal(others.length, 0);
  assert.equal('fingerprint' in mine[0], false); assert.equal('requestId' in mine[0], false);
});
test('反馈同键并发重试仅保存一次，同键异内容拒绝', async () => {
  const input = payload();
  const [first, retry] = await Promise.all([call('student', 'feedback.submit', input), call('student', 'feedback.submit', input)]);
  assert.equal(first.id, retry.id); assert.equal(retry.replayed, true);
  assert.equal(await db.transact(s => s.feedback.filter(x => x.userId === 'demo-student' && x.requestId === input.requestId).length), 1);
  await reject(call('student', 'feedback.submit', { ...input, content: '另一个问题' }), 'IDEMPOTENCY_MISMATCH');
  const anotherUser = await call('teacher', 'feedback.submit', input); assert.notEqual(anotherUser.id, first.id);
});
test('只有授权管理员可查看和回复，回复在本人记录中可见', async () => {
  const row = await call('student2', 'feedback.submit', payload({ category: 'suggestion' }));
  await reject(call('student', 'admin.feedback', { isAdmin: true }), 'FORBIDDEN');
  await reject(call('student', 'admin.replyFeedback', { id: row.id, reply: '伪造管理员' }), 'FORBIDDEN');
  await reject(call('admin', 'admin.replyFeedback', { id: row.id, reply: ' ' }), 'VALIDATION');
  const results = await Promise.allSettled([call('admin', 'admin.replyFeedback', { id: row.id, reply: '已收到你的建议，谢谢反馈。' }), call('admin', 'admin.replyFeedback', { id: row.id, reply: '重复处理' })]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(results.find(x => x.status === 'rejected').reason.code, 'STATE');
  const mine = await call('student2', 'feedback.mine'); const feedback = mine.find(x => x.id === row.id);
  assert.equal(feedback.statusText, '已回复'); assert.equal(feedback.reply, '已收到你的建议，谢谢反馈。'); assert.ok(feedback.repliedAt);
  const admin = await call('admin', 'admin.feedback', { status: 'replied' }); assert.ok(admin.some(x => x.id === row.id && x.repliedBy === 'demo-admin'));
});
test('未核验但已登录用户可反馈核验问题，负责人工作台计数真实', async () => {
  const before = await call('admin', 'admin.dashboard');
  const row = await call('guest', 'feedback.submit', payload({ content: '身份审核进度应该在哪里查看？' }));
  const after = await call('admin', 'admin.dashboard'); assert.equal(after.feedback, before.feedback + 1);
  assert.equal((await call('guest', 'feedback.mine'))[0].id, row.id);
  await reject(service.execute(null, 'feedback.mine'), 'UNAUTHENTICATED');
});
for (const [name, changes] of [['空白内容', { content: '  ' }], ['超过1000字', { content: 'x'.repeat(1001) }], ['无效类型', { category: '__proto__' }], ['缺少请求ID', { requestId: '' }]]) test('反馈字段校验：' + name, async () => { await reject(call('student', 'feedback.submit', payload(changes)), 'VALIDATION'); });
