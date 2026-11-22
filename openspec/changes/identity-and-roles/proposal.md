# Proposal

## Why
学院资格和教师身份必须核验，微信会话不等同学校认证。课程演示需要可隔离的测试账号及人工审核闭环（F01）。

## What Changes
- 微信可信会话与本地测试会话分离；人工审核、拒绝重提和学工号有效唯一。
- 管理员权限独立由服务端命令授权，不接受客户端自选。

## Capabilities
### New Capabilities
- `identity-and-roles`: 身份核验、会话、独立授权与隐私边界。
### Modified Capabilities
无。

## Impact
server/service.js、server/http.js、cloudfunctions/api、登录和身份页面。SSO 为待授权外部依赖。
