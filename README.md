# 华中师范大学计算机学院会议室预约

原生微信小程序 + Node.js + PostgreSQL 的课程项目。首页沿用提供的 Pixso 校园背景、三快捷入口、日历、蓝白圆角卡片、红绿占用条及首页/我的导航。**当前可运行的是本地课程开发环境，使用虚构测试身份；尚未部署 CloudBase 或接入学校 SSO。**

## 快速运行

需要 Node.js 22 或更高版本。Windows PowerShell 中若 npm 脚本执行受限，使用 `npm.cmd`。

```powershell
npm.cmd ci
npm.cmd start
```

默认启动 `http://127.0.0.1:3000`。首次启动自动初始化五间会议室及五个测试账号，数据保存在 `data/local/`，重启保留。数据库是 PGlite（嵌入式真实 PostgreSQL 引擎），不是前端静态数组或内存假后端。测试身份不代表真实学院认证。

在微信开发者工具选择“导入项目”，目录选择本 README 所在目录，读取 `project.config.json`。本地 AppID 占位为 `touristappid`，可选测试号模式或换成自己的小程序 AppID；具体游客/测试号能力以开发者工具提示为准。确认 `miniprogramRoot=miniprogram/`。本地调试打开“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”；`miniprogram/config.js` 默认 `local`。首页点击“进入登录”选择测试身份。

**本地回环接口只供开发者工具模拟器联调，手机真机不能访问电脑的 127.0.0.1。** 真机应使用后文已授权云环境。测试登录服务强制只绑定回环地址，不向局域网开放测试管理员账号。

## 演示闭环

1. 选择“测试学生甲”，选未来日期、7081 房间、14:30—17:50，填写用途、人数（≤12）、电话后提交，结果为“申请已提交，等待管理员审核”。
2. “我的 → 切换登录账号 → 测试教师”，同房重叠区间应冲突；相邻的 17:50—18:20 可提交并直接成功。
3. 切到“测试负责人”，进入“管理工作台 → 学生预约审批”，批准或填写拒绝原因后拒绝。拒绝、取消、失效释放时段。
4. 回到学生账号，在“我的预约”查看最新状态；开始前可二次确认取消，开始瞬间起不可自助取消。
5. “未核验测试用户”先提交虚构姓名、学工号、师生类型和手机号；未通过前不可查日程。负责人在用户身份审核中处理，通过后才获得对应师生权限。

| 测试账号 | 身份 | 独立管理员授权 |
|---|---|---|
| demo-student / demo-student2 | 已核验学生 | 无 |
| demo-teacher | 已核验教师 | 无 |
| demo-admin | 已核验学生 | 有；自身预约仍待确认 |
| demo-guest | 未提交身份 | 无 |

手机号 `13800000001` 等仅是虚构格式样本，不会发送短信，也不视为验证真实手机号。

## 验证

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run spec:validate
npm.cmd run test:postgres
```

`test` 使用隔离内存 PostgreSQL 测试库，覆盖业务/权限/HTTP、原生 Page 事件对真实接口、WCC 时间条模板渲染。`check` 检查结构、JS/JSON、云函数副本一致性，并运行 WCC/WCSC 编译。`test:postgres` 需要 `TEST_DATABASE_URL` 指向**专用测试库**，未配置会明确跳过；它验证两个独立连接池的数据库行锁，不以 PGlite 单连接测试冒充跨实例验证。结果与未验证项见 [测试报告](docs/test-report.md)。

## 可选外部 PostgreSQL

复制 `.env.example` 为 `.env`，设置 `DB_DRIVER=pg` 和服务端 `DATABASE_URL` 后执行 `npm run db:init`。若仅本地演示需要测试用户，显式设置 `ENABLE_DEV_LOGIN=true`。云环境始终为 `false`。

连接安全环境启用 `PG_SSL=true`；私有 CA 放在忽略提交的 `certs/`，设置 `PG_CA_FILE`。项目不使用 `rejectUnauthorized:false`。数据库初始化角色须能建表；运行角色须拥有业务表、能绕过本项目无客户端策略的 RLS（或作为表所有者）。业务表禁止小程序/网页客户端直接读写。

## CloudBase 接入

源码提供可上传的微信云函数 `cloudfunctions/api/`，与本地共用服务和 SQL；每次修改后执行 `npm run cloud:prepare`。当前只验证本地打包与入口隔离，**没有云账号，未声称已部署成功**。

1. 使用已授权的小程序 AppID，准备 CloudBase PostgreSQL 环境并完成小程序关联，不执行付费购买。
2. 从控制台取得供服务端使用的 PostgreSQL 协议连接地址及网络/证书要求；先用运维角色运行 `DB_DRIVER=pg` 下的 `npm run db:init`，不启用测试用户。
3. 配置云函数环境变量 `DATABASE_URL`、`ENABLE_DEV_LOGIN=false`、按环境设置 `PG_SSL`；如使用 `PG_CA_FILE`，自行将证书放入函数包内对应相对路径。本项目打包脚本不会复制本地密钥或证书。
4. 云函数选择支持 Node.js 18+ 的可用运行时，入口 `index.main`，建议超时≥20秒、内存≥256MB；按控制台实际选项核对。部署 `api` 时安装云端依赖，勿部署本地 HTTP 测试登录服务。
5. 将 `miniprogram/config.js` 切为 `cloud` 并填写环境 ID；项目 AppID 换成自己的值。`wx.cloud.init` 与 `callFunction` 只调用此函数。
6. 用户首次微信登录后，在身份页可查看自己的内部用户 ID。运维连接同一库执行 `node --env-file-if-exists=.env scripts/grant-admin.js <用户ID>`，独立授权首名负责人；该命令不改变其师生核验状态。
7. 在专用云测试库运行 `test:postgres`，再按 [验收步骤](docs/acceptance.md) 做微信开发者工具和真机测试。学校 SSO 另需授权、协议、回调域名及可信身份字段；当前页面不会采集校园密码。

官方文档与已核对版本见 [技术依据](docs/technical-references.md)。

## 项目结构与协作

```text
miniprogram/       13 个原生页面、3 个共享组件、API 适配器、原型素材
server/            共享业务规则、HTTP 开发入口、数据库事务与 schema
cloudfunctions/api/微信云函数及可同步服务端副本
tests/             可执行本地业务、接口、页面和组件测试
tests-postgres/    独立 PostgreSQL 连接池并发测试
openspec/          spec-driven 规格、设计、任务及外部验收待办
design/            原型提取证据、PNG 资源、视觉差异说明
docs/              架构、API、测试报告、验收和四人五周交接
```

Git 已初始化。原型和原始需求保留，未上传远程仓库。四人接手建议和五周安排见 [交接文档](docs/handover.md)。

## 实现边界

本地 P0 核心已实现；真实 AppID、CloudBase、SSO 授权及微信开发者工具/真机验收仍是外部接入项。尚未实现 P1 停用恢复、独立通知中心、房间维护和完整后台定时整理。五房间课设采用全局数据库锁和全量历史读取，保证规则一致但不适合直接宣称生产吞吐；分页、限流、备份、留存和正式隐私制度需上线前完善。原型专有图层未完整解析，图片中合成的校徽/校名作为原始素材保留。未知房间资料未编造。
