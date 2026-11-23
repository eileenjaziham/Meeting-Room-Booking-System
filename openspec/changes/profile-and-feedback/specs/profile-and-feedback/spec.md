## Purpose
让学生通过“我的”明确查看当前账号的姓名、学号及联系方式，识别当前使用的构建版本，并在遇到预约或使用问题时提交私有反馈、查看处理状态和授权管理员的回复。

## ADDED Requirements
### Requirement: Personal information and current version
系统 SHALL 在“我的”提供个人信息入口，并显示与当前构建一致的版本号；个人信息仅为当前登录账号资料，未核验信息不得显示为已生效身份。
#### Scenario: Student reads profile
- **WHEN** 已登录学生打开个人信息
- **THEN** 展示本人姓名、学号、身份类型、电话和核验状态
#### Scenario: Current build version
- **WHEN** 学生打开“我的”
- **THEN** 可见当前版本号且与项目构建版本一致

### Requirement: Private persistent feedback
系统 SHALL 允许已登录用户选择反馈类型并提交1—1000字内容，保存本人记录；重复请求不重复创建，不接受客户端指定归属。
#### Scenario: Retry after network interruption
- **WHEN** 同用户使用同一请求标识和相同内容重试反馈
- **THEN** 返回原记录且不重复创建
#### Scenario: Other user attempts to read
- **WHEN** 另一普通用户在本人反馈接口伪造userId
- **THEN** 仍只返回该会话用户自己的反馈

### Requirement: Personal avatar without name editing
系统 SHALL 在“我的”和“个人信息”提供用户主动选择头像的入口，将压缩后的PNG/JPEG头像按当前可信会话保存并在重新登录后读取；姓名只读，头像接口不得修改姓名、学工号、身份、权限或其他账号资料。
#### Scenario: Replace own avatar
- **WHEN** 用户选择有效头像并保存
- **THEN** 两个页面显示新头像，再次读取账号仍可见，取消或上传失败时保留原头像
#### Scenario: Forged profile fields
- **WHEN** 用户通过头像请求附带其他用户ID、姓名或管理员字段
- **THEN** 仅更新当前登录账号头像，姓名及权限不变，其他账号头像不变

### Requirement: Authorized feedback response
系统 SHALL 仅允许独立授权管理员查看待办和填写回复，用户可从本人反馈看到回复；空回复被拒绝。
#### Scenario: Administrator responds
- **WHEN** 管理员对待处理反馈提交有效回复
- **THEN** 记录处理人和时间并显示已回复，普通用户不可调用该操作
