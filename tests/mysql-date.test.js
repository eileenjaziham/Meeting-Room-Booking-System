const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mysqlDay } = require('../server/db');

// mysql2 默认把 DATE 列解析成「本地零点」的 Date。东八区下 toISOString() 会退到前一天，
// 审批时按退过一天的日期重算开始时间就会误判为“已经过去”，所以必须按本地年月日还原。
test('MySQL DATE 列按本地年月日还原，不因时区退一天', () => {
  const localMidnight = new Date(2026, 10, 28); // 2026-11-28 00:00（本地）
  assert.equal(mysqlDay(localMidnight), '2026-11-28');
  assert.notEqual(mysqlDay(localMidnight), localMidnight.toISOString().slice(0, 10), '不应依赖 toISOString 的 UTC 日期');
});

test('已开启 dateStrings 时字符串原样返回，跨月跨年不补零错位', () => {
  assert.equal(mysqlDay('2026-11-28'), '2026-11-28');
  assert.equal(mysqlDay(new Date(2027, 0, 1)), '2027-01-01');
  assert.equal(mysqlDay(new Date(2026, 11, 31)), '2026-12-31');
});
