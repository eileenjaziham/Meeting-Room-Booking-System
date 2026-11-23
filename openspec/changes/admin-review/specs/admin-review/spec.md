## Purpose

为独立授权的办公室负责人提供所有五间会议室的学生审批、用户身份核验和预约台账，使管理决定有原因及处理人可追溯，并保证多个负责人同时处理时只有一次合法状态转换。

## ADDED Requirements

### Requirement: Administrator workbench on home
系统 SHALL 在授权管理员首页按原型提供学生预约审核、预约台账、会议室管理三个顶部快捷入口；学生预约审核仅保留顶部一个入口。工作台提供用户审核和用户反馈，另显示预约统计；管理员首页不再堆放房间日历和列表。“我的”不放置管理工作台入口。普通师生保持原首页，不请求管理统计；从管理页面返回首页时刷新真实待办。

#### Scenario: Administrator enters home
- **WHEN** 已授权管理员进入首页
- **THEN** 可直接查看管理待办并进入预约审核、台账、用户审核和反馈处理，会议室管理入口打开独立管理页

#### Scenario: Switch back to student
- **WHEN** 管理员切换为普通学生账号
- **THEN** 首页清空管理统计并显示普通师生入口，不请求管理接口，伪造前端跳转仍不能取得后端管理权限

### Requirement: Room suspension with impact preview
系统 SHALL 仅允许授权负责人在独立会议室管理页查看五房固定资料、安排停用和解除停用。停用必须填写原因并先预览受影响预约；确认时重新核对预览版本，在同一事务中创建停用、取消重叠的待确认/成功预约、产生本人可读站内通知及管理日志。预览后预约变化须重新确认，失败整体回滚，重试不重复处理。

#### Scenario: Confirm a suspension
- **WHEN** 负责人预览并确认有受影响预约的停用
- **THEN** 停用区间禁止创建重叠预约，受影响用户在“我的预约”看到取消通知及原因，非本人不能读取通知

#### Scenario: Release and retain history
- **WHEN** 负责人填写恢复原因并解除停用
- **THEN** 区间重新可约，保留停用/恢复记录和操作者，已取消预约不恢复，历史已完成预约不变

### Requirement: Authorized atomic student review
系统 SHALL 仅允许授权负责人审批仍未开始的待确认学生申请，批准时复核身份与容量，拒绝必须给出原因。

#### Scenario: Concurrent reviews
- **WHEN** 两位负责人同时批准或拒绝同一申请
- **THEN** 最多一次有效转换，后处理者得到已处理或失效错误

#### Scenario: Reject with no reason
- **WHEN** 负责人拒绝申请但原因为空
- **THEN** 服务器拒绝操作，申请继续待确认

### Requirement: Searchable private ledger
系统 SHALL 允许负责人按会议室、日期、有效状态、申请人姓名或学工号查询台账及必要联系方式。

#### Scenario: Ordinary user requests ledger
- **WHEN** 普通师生调用全部预约台账
- **THEN** 拒绝访问，无论客户端是否显示管理页面

### Requirement: Traceable review metadata
系统 SHALL 保存审核和取消处理人、时间、拒绝原因以及最低限度管理日志。

#### Scenario: Read reviewed booking
- **WHEN** 本人或负责人查询已拒绝的预约
- **THEN** 可查看拒绝原因、处理时间与处理人标识
