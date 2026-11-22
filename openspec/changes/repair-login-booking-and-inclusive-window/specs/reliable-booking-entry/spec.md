## Purpose
提供可实际完成的会议室预约登录与提交入口，使会话失效有清晰恢复路径、已填资料可保留，并准确遵循包含当天的七日范围及负责老师和实际借用人的信息要求。
## ADDED Requirements
### Requirement: Visible and recoverable login
系统 SHALL 启动显示登录页，未登录不反复请求401；会话失效时返回登录，登录后能回到原预约表单。
#### Scenario: Expired session during booking
- **WHEN** 预约表单请求遇到会话失效
- **THEN** 只跳转一次登录且保留预约路径和已填资料
### Requirement: Persistent local session
系统 SHALL 将本地会话令牌以哈希和有效期保存，后端重启不使未过期会话失效。
#### Scenario: HTTP server restart
- **WHEN** 本地HTTP服务重建后使用原有效令牌
- **THEN** 登录保持有效，12小时到期后才拒绝
### Requirement: Seven dates including today
系统 SHALL 仅开放当天至当天+6天，共7个日期，前后端一致。
#### Scenario: November twenty-second
- **WHEN** 北京时间今天为11月22日
- **THEN** 11月28日可预约，11月29日拒绝
### Requirement: Responsible teacher and borrower
系统 SHALL 要求填写负责老师及借用人姓名，服务端校验并保存，详情可见；申请人身份仍由会话确定。
#### Scenario: Required booking names
- **WHEN** 用户提交空白负责老师或借用人
- **THEN** 提示具体缺项且不创建预约，补齐后可正常提交
