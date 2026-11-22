# 接口约定

本地 `POST /api`：`{ "action": "...", "payload": {} }`，请求头 `Authorization: Bearer <本地令牌>`。云端 `wx.cloud.callFunction({name:'api',data:{action,payload}})`，身份只取微信可信上下文。

成功：`{ok:true,data:...}`；失败：`{ok:false,error:{code,message}}`。本地按类别返回 400/401/403/404/409/500，云函数使用同样业务错误对象。内部错误不把数据库连接串返回客户端。

| action | payload | 访问/结果 |
|---|---|---|
| me | 无 | 本人资料、isAdmin、本人身份审核历史、serverNow |
| identity.submit | name, studentNo, identityType, phone | 未提交/已拒绝账号，创建待核验资料；不提升权限 |
| rooms.list | date | 已核验师生；五房间和脱敏 occupied |
| rooms.detail | roomId, date | 已核验师生；指定房间资料和占用 |
| reservation.create | roomId, date, start, end, purpose, attendees, phone, notes?, requestId | 服务端核验；学生 pending，教师 approved |
| reservation.mine | status?, date? | 本人预约筛选 |
| reservation.detail | id | 仅本人普通详情，ID 猜测不能越权 |
| reservation.cancel | id | 仅本人未开始的有效预约 |
| admin.dashboard | 无 | 授权负责人；预约/身份待办和总记录数 |
| admin.reservations | roomId?, date?, status?, applicant? | 负责人；按房、日、状态、姓名/学工号筛选 |
| admin.reservationDetail | id | 负责人；必要联系信息、用途及处理记录 |
| admin.reviewReservation | id, decision: approve/reject, reason? | 负责人；拒绝原因必填，重复审批为 STATE |
| admin.identities | status? | 负责人；身份审核列表及资料快照 |
| admin.reviewIdentity | id, decision, reason? | 负责人；通过后赋经核验师生身份，拒绝原因必填 |

本地另提供 `GET /health` 显示数据库驱动和开发模式；`POST /dev/login {account}` 只在回环开发服务启用，返回随机会话令牌。不存在客户端授予管理员权限接口。

预约字段：用途1—200字，备注≤500字，预计人数正整数且不超过已知容量；7060 未知容量仍可提交并提示确认。手机号只检查大陆11位格式。日期 YYYY-MM-DD，时间 HH:mm。重复提交 requestId 为8—100字符，用户作用域唯一，相同内容返回原预约；不同内容相同 key 返回 IDEMPOTENCY_MISMATCH。没有自动重建取消预约的行为。

占用条对象只有 `{start,end,label:'已占用'}`，不返回预约ID、申请人姓名、电话、用途或待确认/成功的区别。查询不预留时段。

主要错误码：VALIDATION、IDENTITY_REQUIRED、FORBIDDEN、UNAUTHENTICATED、NOT_FOUND、TIME_RANGE、PAST_TIME、CAPACITY、CONFLICT、STATE、IDENTITY_CONFLICT、IDEMPOTENCY_MISMATCH。页面显示错误并提供刷新/重试；审批冲突须刷新最新状态。
