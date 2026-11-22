## Purpose

保证学院会议室预约从提交到审核、取消或自然失效的完整业务一致性，区分学生与教师流程，支持任意分钟与北京时间边界，并使网络重试及多用户竞争不会产生重复有效预约。

## ADDED Requirements

### Requirement: Minute-accurate legal interval
系统 SHALL 以服务器北京时间校验同一天 08:00 ≤ 开始 < 结束 ≤ 22:00，开始必须晚于当前时间；七天仅为建议。

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
系统 SHALL 只允许本人查看普通预约详情，在开始前取消有效记录，终态保留历史且不恢复。

#### Scenario: Cancel at exact start
- **WHEN** 普通用户在成功预约开始瞬间申请取消
- **THEN** 系统拒绝自助取消
