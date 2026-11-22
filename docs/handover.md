# 四人五周交接

当前本地 P0 功能、测试与工程已实现。下表是组员接手分工建议，**不是虚构已完成五周开发记录**。

| 周 | A 前端 | B 后端/数据库 | C 需求/原型 | D 联调/质量 |
|---|---|---|---|---|
| 1 | 导入小程序、对照首页 | 跑本地数据库与API | 核对V1.1和Pixso差异 | 运行测试与记录环境 |
| 2 | 预约/身份页面设备适配 | 获授权后接CloudBase PG | 与负责人核实容量/设备/核验依据 | 权限与输入边界验收 |
| 3 | 学生/教师/管理真机闭环 | 云函数独立连接并发验证 | 维护OpenSpec任务/场景 | 回归、缺陷修复、阶段演示 |
| 4 | 解决设备和异常交互问题 | 备份/访问角色/部署复核 | 整理真实调研证据 | 隐私、日志与恢复演练 |
| 5 | 演示流程与截图 | 环境配置交接 | 结题说明、未知项 | 最终验收报告与归档 |

协作时每功能分支对应一个 OpenSpec 变更。使用当前 OpenSpec 2.0.0 的 `new change → proposal/specs/design/tasks → validate`。现有四项变更保存了真实实现进度，外部联调任务未勾选，未把它们强行归档为全部完成。可运行 `npx openspec status --change reservation-lifecycle --json` 和 `npx openspec instructions apply --change reservation-lifecycle --json` 查看后续任务。

变更服务端之后必须 `npm run cloud:prepare`，同一提交包含共享源与云函数副本。提交前 `npm test`、`npm run check`、`npm run spec:validate`。正式云配置不入库，禁止提交 `.env`、证书、真实身份资料、数据库目录和微信私有配置。

需求追溯：F01 → identity-and-roles；F02/F03 → room-schedule；F04/F06/F07/F11 → reservation-lifecycle；F05/F10 → admin-review。B02—B12、B16见业务测试；未实现 F08/F09/F11E 作为 P1 保留。

待外部确认：学校资格核验授权及真实渠道、SSO接口和回调要求、7060容量和各房设备、学院业务规则最终批准、数据保留期限、隐私告知、云资源额度、AppID和测试设备。不把课程用户资料审核当成校方已授权的真实认证。
