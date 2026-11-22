# Proposal
## Why
用户报告登录页丢失、401后表单无法提交，并明确七天包含当天，还要求填写负责老师和借用人。
## What Changes
- 登录页作为启动页；失效会话统一回到登录并保留预约路径和草稿。
- 本地会话令牌哈希入库，后端重启不再丢失有效会话。
- 日期严格为当天至当天+6天；新增两个必填字段并在详情/台账保留。
## Capabilities
### New Capabilities
- `reliable-booking-entry`: 可靠的登录、表单恢复、提交与含当天七天边界。
### Modified Capabilities
无；现行规则同步修正，旧请求/历史预约保留。
## Impact
HTTP会话、数据库、前端API、登录入口、预约表单与详情、业务/页面/恢复测试。
