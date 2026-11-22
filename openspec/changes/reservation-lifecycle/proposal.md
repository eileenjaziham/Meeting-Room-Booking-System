# Proposal

## Why
预约须保证学生和教师分流，且多人并发不会重复占用（F04、F06、F07、F11）。

## What Changes
- 分钟级任意时间、人数/字段校验、六种状态、本人查询和取消。
- PostgreSQL 行锁事务、幂等键和服务器北京时间判定。

## Capabilities
### New Capabilities
- `reservation-lifecycle`: 预约创建、互斥、幂等、查询、取消与有效状态。
### Modified Capabilities
无。

## Impact
服务层、数据库、预约表单、结果和我的预约页面、业务/接口/并发测试。
