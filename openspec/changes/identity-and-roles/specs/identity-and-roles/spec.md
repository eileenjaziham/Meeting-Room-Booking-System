## Purpose

为学院会议室预约提供可替换的身份核验边界，区分微信会话、已核验师生身份和独立授权负责人，支持隔离课程测试身份，并防止客户端提权与个人信息越权泄露。

## ADDED Requirements

### Requirement: Verified identity before room access
系统 SHALL 只允许已核验学生或教师查询房间与预约。申请教师身份不能立即取得教师权限；系统不采集校园密码。

#### Scenario: Pending teacher profile
- **WHEN** 未核验用户提交教师类型的人工审核资料
- **THEN** 用户保持未核验业务权限，查询与预约均被拒绝

### Requirement: Independent administrator grant
系统 SHALL 从可信服务端授权识别负责人，客户端自选身份不产生管理权限。

#### Scenario: Forged grant
- **WHEN** 普通用户提交 isAdmin 或 role 字段调用管理接口
- **THEN** 服务端拒绝管理操作且不修改授权

### Requirement: Manual review history and unique verified number
系统 SHALL 保存人工审核资料快照、处理人、原因和时间；拒绝后允许重提，已生效学工号不得绑定不同账号。

#### Scenario: Rejected identity resubmission
- **WHEN** 负责人拒绝身份申请后用户修正测试资料重提
- **THEN** 保留原拒绝记录并创建新的待审核申请

#### Scenario: Duplicate verified number
- **WHEN** 用户试图绑定另一有效账号已核验的学工号
- **THEN** 系统提示联系负责人且不泄露另一账号资料
