# 接口约定

本地 `POST /api`：`{ "action": "...", "payload": {} }`，请求头 `Authorization: Bearer <本地令牌>`。云端 `wx.cloud.callFunction({name:'api',data:{action,payload}})`，身份只取微信可信上下文。

成功：`{ok:true,data:...}`；失败：`{ok:false,error:{code,message}}`。本地按类别返回 400/401/403/404/409/500，云函数使用同样业务错误对象。内部错误不把数据库连接串返回客户端。

| action | payload | 访问/结果 |
|---|---|---|
| me | 无 | 本人资料、isAdmin、本人身份审核历史、serverNow |
| feedback.submit | category: usage/reservation/suggestion/other, content, requestId | 已登录用户；内容1—1000字，保存本人反馈，相同请求幂等，不接受客户端指定归属 |
| feedback.mine | 无 | 当前会话本人反馈、处理状态与管理员回复，不返回其他人的记录 |
| admin.feedback | status?: pending/replied | 授权负责人；反馈待办与已回复列表 |
| admin.replyFeedback | id, reply | 授权负责人；1—1000字回复，记录处理人和时间；重复处理拒绝 |
| identity.submit | name, studentNo, identityType, phone | 未提交/已拒绝账号，创建待核验资料；不提升权限 |
| rooms.list | date | 已核验师生；五房间和脱敏 occupied |
| rooms.detail | roomId, date | 已核验师生；指定房间资料和占用 |
| reservation.create | roomId, date, start, end, responsibleTeacher, borrowerName, purpose, attendees, phone, notes?, requestId | 负责老师与借用人各1—50字必填；学生pending，教师approved；权威申请人取会话 |
| reservation.mine | status?, date? | 本人预约筛选 |
| reservation.detail | id | 仅本人普通详情，ID 猜测不能越权 |
| reservation.cancel | id | 仅本人待确认/成功预约；距开始至少5小时（含边界）；不足返回CANCELLATION_CUTOFF |
| admin.cancelReservation | id, reason | 独立授权管理员取消有效预约；原因1—200字，取消、通知、审计同一事务，不受5小时限制 |
| admin.dashboard | 无 | 授权负责人；预约/身份待办和总记录数 |
| admin.reservations | roomId?, date?, status?, applicant? | 负责人；按房、日、状态、姓名/学工号筛选 |
| admin.reservationDetail | id | 负责人；必要联系信息、用途及处理记录 |
| admin.reviewReservation | id, decision: approve/reject, reason? | 负责人；拒绝原因必填，重复审批为 STATE |
| admin.identities | status? | 负责人；身份审核列表及资料快照 |
| admin.reviewIdentity | id, decision, reason? | 负责人；通过后赋经核验师生身份，拒绝原因必填 |
| admin.rooms | 无 | 授权负责人；会议室资料、停用/解除记录、操作者 |
| admin.roomCreate | id, number, capacity, location, equipment, open?, photo?, photoNote? | 授权负责人；新增会议室，编号和名称不能重复，容量为1—10000的整数；photo 可为内置路径（≤500字）或小程序选择本地图片后提交的 data:image/(png\|jpeg\|webp);base64 数据地址（解码后≤600KB） |
| admin.roomUpdate | roomId, number, capacity, location, equipment, open?, photo?, photoNote? | 授权负责人；修改会议室资料，容量不能小于已有有效预约人数 |
| admin.roomDelete | roomId | 授权负责人；删除无预约和停用历史的会议室 |
| admin.roomBlockPreview | roomId, startDate, endDate, start, end, reason | 返回受影响有效预约与previewVersion |
| admin.roomBlockCreate | 上述字段, previewVersion, requestId | 版本变化须重预览；事务创建停用、取消预约、通知与审计 |
| admin.roomBlockRelease | id, reason | 解除停用；不恢复已取消预约 |
| notification.mine | 无 | 本人停用取消及管理员取消的站内通知 |
| notification.readReservation | id | 仅本人可将该预约所有未读通知标记已读；重复调用返回readCount=0 |
| notification.read | id | 仅本人可标记已读 |

本地另提供 `GET /health` 显示数据库驱动和开发模式；`POST /dev/login {account}` 只在回环开发服务启用，返回随机会话令牌。不存在客户端授予管理员权限接口。

预约字段：用途1—200字，备注≤500字，预计人数正整数且不超过房间固定容量；五房资料以Pixso为准。日期YYYY-MM-DD、时间HH:mm，仅允许服务器北京时间含今天7个日期且开始晚于当前时刻；第8天及之后返回BOOKING_WINDOW并提示联系曹闯老师（QQ28061535）。me接口同时提供bookingWindow.first/last和管理员公开联系信息。手机号只检查大陆11位格式。requestId为8—100字符，用户作用域唯一，相同内容返回原预约；同键异内容返回IDEMPOTENCY_MISMATCH，取消后不重建。

`me.reminders` 返回仅本人的 `bookingDates`（日期→待确认/成功记录数）和 `unreadCount`。通知覆盖审核通过、拒绝、待审核到点失效及管理员/停用取消。审核和通知在同一数据库事务内保存；公开日程不返回他人通知。已读由预约人查看成功结果或详情后显式提交；管理员查看他人记录不会清除其未读状态。

占用条对象只有 `{start,end,label}`，有效预约为“已占用”，停用安排为“停用”；不返回预约ID、申请人姓名、电话、用途或待确认/成功的区别，停用原因仅管理员及受影响预约本人可查。查询不预留时段。

主要错误码：VALIDATION、IDENTITY_REQUIRED、FORBIDDEN、UNAUTHENTICATED、NOT_FOUND、TIME_RANGE、PAST_TIME、CAPACITY、CONFLICT、STATE、IDENTITY_CONFLICT、IDEMPOTENCY_MISMATCH。页面显示错误并提供刷新/重试；审批冲突须刷新最新状态。
