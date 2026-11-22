## Purpose

为独立授权的办公室负责人提供所有五间会议室的学生审批、用户身份核验和预约台账，使管理决定有原因及处理人可追溯，并保证多个负责人同时处理时只有一次合法状态转换。

## ADDED Requirements

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
