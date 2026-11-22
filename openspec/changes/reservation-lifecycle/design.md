## Context
五间房课程规模，需防跨实例并发与客户端伪造，遵守 B02—B12、B16。
## Goals / Non-Goals
正确预约闭环；不实现 P1 停用通知、不增加待确认配额或教师优先规则。
## Decisions
Node 服务层共享于本地和 CloudBase。数据库存 JSONB 业务快照、外键、唯一索引和状态约束。每次事务以 READ COMMITTED 获 app_lock 单行 FOR UPDATE，再读、校验、写入后提交；全局锁覆盖身份批准和预约创建/审批/取消。PGlite 额外排队解决单连接交错，不作为云端锁替代。过期/完成先计算有效状态，任意后续查询使用同一规则；错误回滚也不改变逻辑判定。幂等键按用户作用域存摘要及预约 ID，重试不重建。
## Risks / Trade-offs
粗粒度锁与全量读取适合小规模课程演示，吞吐和历史数据增长有限，正式运营需分页与按房间锁/数据库原子预约函数；不声称已做生产负载测试。PGlite 测试不证明云端多连接锁已部署验证，另提供 TEST_DATABASE_URL 测试。
## Migration Plan
npm run db:init 只建表和补种子；业务时间为带 +08:00 的日期解析后存 epoch 毫秒。云环境必须提供 PostgreSQL 协议连接。
