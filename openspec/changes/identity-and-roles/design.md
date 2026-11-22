## Context
需求基线 F01、B01；无学校 SSO 授权，课程只处理虚构测试身份。
## Goals / Non-Goals
实现人工身份审核和独立管理授权；不采集校园密码，不声称学校真实身份已核验。
## Decisions
云函数从 getWXContext 取 OPENID/APPID 后散列为内部 ID。本地回环 HTTP 发随机会话令牌，测试账号不在云端启用。审核资料存快照，批准才更新权威身份；数据库部分唯一索引约束有效学工号。管理员用服务端 CLI 独立授权。
## Risks / Trade-offs
测试登录不用于正式服务。可信核验渠道、真实资料授权与隐私规则须学校确认。
## Migration Plan
初始化 users/identity_reviews/admin_grants；首次负责人由运维 CLI 授予；不自动赋予教师身份。
