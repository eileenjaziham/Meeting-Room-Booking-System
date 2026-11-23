## Purpose

保证学院会议室预约从提交到审核、取消或自然失效的完整业务一致性，区分学生与教师流程，支持任意分钟与北京时间边界，并使网络重试及多用户竞争不会产生重复有效预约。

## ADDED Requirements

### Requirement: Minute-accurate legal interval
系统 SHALL 以服务器北京时间校验同一天08:00 ≤ 开始 < 结束 ≤ 22:00，开始必须晚于当前时间，且最多提前7天；第8天起不允许线上预约。

#### Scenario: Arbitrary valid minutes
- **WHEN** 用户选择未来日期的 09:15—11:45
- **THEN** 服务器保留精确分钟并允许合法字段提交

#### Scenario: Boundary and cross-day inputs
- **WHEN** 开始已到、开始不早于结束或时间跨日
- **THEN** 服务器拒绝提交且不创建有效预约

### Requirement: Student and teacher status divergence
系统 SHALL 将学生申请设为待确认、教师预约设为成功；两者均阻塞同房重叠，相邻边界允许。

#### Scenario: Pending student blocks teacher
- **WHEN** 教师提交与学生待确认申请重叠的区间
- **THEN** 拒绝冲突，不能覆盖学生占用

### Requirement: Atomic conflict and idempotency protection
系统 SHALL 在并发条件下仅允许一条同房重叠有效预约；同用户同请求标识相同内容重试返回原记录，不同内容被拒绝。

#### Scenario: Concurrent competitors
- **WHEN** 多用户同时提交同一会议室相同时段
- **THEN** 最多一个提交成功，其他得到冲突结果

#### Scenario: Lost response retry
- **WHEN** 成功创建的请求因网络异常使用原标识重试
- **THEN** 返回原预约 ID，不产生第二条记录

### Requirement: Effective terminal states without scheduler
系统 SHALL 在开始瞬间将未审核申请视为失效，在结束瞬间将成功预约视为完成；不得依赖定时任务。

#### Scenario: Pending start reached
- **WHEN** 申请未审核且服务器到达预约开始时间
- **THEN** 申请失效、不能批准且不再阻塞后续合法区间

### Requirement: Owner-only cancellation and history
系统 SHALL 只允许本人查看普通预约详情，距会议开始至少5小时才可自助取消待确认或成功预约；恰好5小时允许，不足5小时拒绝。终态保留历史且不恢复。

#### Scenario: Cancel at exact start
- **WHEN** 普通用户在成功预约开始瞬间申请取消
- **THEN** 系统拒绝自助取消

#### Scenario: Exact five-hour cutoff
- **WHEN** 14:00开始的预约人在当天09:00取消
- **THEN** 允许取消；09:00之后拒绝，服务端按北京时间重新校验

### Requirement: Administrator cancellation
系统 SHALL 允许独立授权管理员取消他人的有效预约，不受五小时限制；须填写取消原因，并在同一事务保存取消状态、本人通知与审计记录。终态不可重复取消。

#### Scenario: Cancel an approved booking near start
- **WHEN** 管理员在距会议开始不足5小时填写原因取消成功预约
- **THEN** 释放时段、保留原因并通知预约人；普通用户不能调用此管理接口

### Requirement: Approved booking room access code
系统 SHALL 仅在成功预约的本人或授权管理员返回数据中展示会议室编号加1234#的密码，公开占用接口不返回密码；待确认和终态不返回密码。

#### Scenario: Student approval reveals access code
- **WHEN** 7081会议室的学生申请获批准
- **THEN** 本人在结果页或详情可看到70811234#；取消或结束后不再返回密码

### Requirement: Personal calendar and unread booking reminders
系统 SHALL 在日历标记本人待确认或预约成功记录所在日期；审核通过、拒绝及到点未审核失效产生本人未读通知，管理员待办按真实待处理数量显示红点。已读状态 SHALL 持久化且仅预约人可清除。

#### Scenario: Review result and read receipt
- **WHEN** 学生预约获批且本人尚未查看结果
- **THEN** 首页我的预约显示红点，查看对应详情后清除；管理员查看不清除学生未读状态

#### Scenario: Active reminder refresh
- **WHEN** 用户停留首页
- **THEN** 每30秒只刷新提醒，离开停止，旧请求响应不能在离页后覆盖状态
