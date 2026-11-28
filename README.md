# 华中师范大学计算机学院会议室预约

原生微信小程序 + Node.js + MySQL 的课程项目。首页沿用提供的 Pixso 校园背景、三快捷入口、日历、蓝白圆角卡片、红绿占用条及首页/我的导航。**当前可运行的是本地课程开发环境，使用虚构测试身份；尚未部署 CloudBase 或接入学校 SSO。**

2026-11-23规则更新：五间房容量和设备以Pixso为准（7060/7081/7091：10人、屏幕；7052：40人、屏幕；7119：100人、投影/音响/话筒）。**含今天在内可预约7天**，服务器按北京时间校验；超出范围请电话联系曹闯老师申请，页面按要求只展示QQ：28061535。预约日期自动显示星期，无需选择年份。详见[最新业务变更](docs/decisions-2026-11-23.md)。

## 快速运行

需要 Node.js 22 或更高版本、MySQL 8.0.16 及以上。Windows PowerShell 中若 npm 脚本执行受限，使用 `npm.cmd`。

```powershell
npm.cmd ci
copy .env.example .env
npm.cmd run db:init
npm.cmd start
```

`db:init` 一条命令完成建库、建表、写入初始数据，并打印摘要：

```
数据库初始化完成
  驱动      mysql（MySQL 8.4.13）
  目标库    meeting_room_booking @ localhost:3306（新建）
  会议室    5 间：7052 40人 · 7060 10人 · 7081 10人 · 7091 10人 · 7119 100人
  账号      5 个：负责人 1、学生 2、教师 1、未核验 1
  负责人    demo-admin
```

- 目标库取 `.env` 的 `MYSQL_DATABASE`（用 `MYSQL_URL` 时取连接串里的库名），库不存在会自动创建，字符集固定 utf8mb4；
- **可重复执行**：只补缺失的表和初始数据，不删除已有房间、账号或预约；
- 初始数据分三块：会议室（`rooms`）、账号与角色（`users` 的师生类型 + 核验状态）、负责人授权（`admin_grants`），全部来自 `server/seed.js`；
- 演示账号受 `ENABLE_DEV_LOGIN=true` 控制：`npm.cmd run db:init -- --demo` 强制写入、`-- --no-demo` 只建库建表不写账号（云环境用）。

不想用 Node 脚本时，也可直接执行纯 SQL：`mysql -uroot -p --default-character-set=utf8mb4 < database/mysql-init.sql`。该文件由 `npm.cmd run db:sql` 依据 `server/schema.mysql.sql` 和 `server/seed.js` 生成，两条路径写入的数据完全一致，`npm test` 会校验它没有被单独改过。

默认启动 `http://127.0.0.1:3000`，连接参数在 `.env` 中修改（`MYSQL_PASSWORD` 必须与本地 root 密码一致）。测试身份不代表真实学院认证。

在微信开发者工具选择“导入项目”，目录选择本 README 所在目录，读取 `project.config.json`。当前工程已使用开发者工具内置测试号；新环境可在导入界面点击“测试号”，选择“不使用云服务”，或换成自己的小程序 AppID。确认 `miniprogramRoot=miniprogram/`，`miniprogram/config.js` 默认 `local`。首次“信任并运行”提示由用户本人确认。首页点击“进入登录”，在登录页填写账号和密码。

**默认本地回环接口只供开发者工具模拟器联调，手机不能访问电脑的127.0.0.1。** 同一热点/Wi-Fi下临时真机演示可使用下述独立局域网模式；正式使用按后文部署云环境。

### 手机热点 / 局域网真机演示

首次将`.env.lan.example`复制为`.env.lan`，填写`LAN_HOST`为电脑当前局域网IPv4、`LAN_CLIENT_IPS`为手机IPv4（多个用逗号分隔）。电脑连接手机热点时，手机地址通常是电脑WLAN显示的网关。实际配置文件已被Git忽略。

先停止正在运行的后端，再执行：

```powershell
npm.cmd run start:lan
```

启动脚本会将小程序接口切换到电脑IP；后端绑定这一私有地址，仅允许该电脑及已配置的手机访问。手机浏览器先打开`http://电脑IP:3000/health`，应出现`ok:true`，再在开发者工具重新编译、重新扫码真机调试并登录。电脑及后端须持续运行，热点变化后需更新IP并重启。此模式使用虚构测试账号与现有本地数据库，不用于公网发布。

回到普通模拟器开发时，停止局域网后端后运行`npm.cmd start`，接口会自动切回本机地址。脚本不修改Windows防火墙或小程序域名校验设置；如果手机浏览器无法连接，需继续检查热点连接和电脑的应用入站规则。

## 演示闭环

1. 在启动页点击“进入登录”，使用 `demo-student / student123` 登录；选未来7天内日期、7081 房间、14:30—17:50，填写用途、人数（≤10）、电话后提交，结果为“申请已提交，等待管理员审核”。
2. “我的 → 切换账号”返回登录页，使用 `demo-teacher / teacher123` 登录；同房重叠区间应冲突，相邻的 17:50—18:20 可提交并直接成功。
3. 使用 `demo-admin / admin123` 登录，进入“管理工作台 → 学生预约审批”，批准或填写拒绝原因后拒绝。拒绝、取消、失效释放时段。
4. 回到学生账号，在“我的预约”查看最新状态；须至少提前5小时才可二次确认取消，恰好5小时可取消，不足5小时联系管理员。成功后结果页和详情页显示会议室密码。
5. 业务需要身份核验时，使用“身份信息”页面提交虚构姓名、学工号、师生类型和手机号；未通过前不可查日程。负责人在用户身份审核中处理，通过后才获得对应师生权限。

启动页直接提供账号密码登录，当前未接入学校平台，不采集校园账号或密码。登录过期后仍能恢复原预约路径与已填写资料。预约表单必填“负责老师、借用人”，姓名会在本人详情和管理员台账显示。七日范围包含当天：例如22号可预约至28号，29号不可。有效本地会话的令牌哈希已保存到数据库，后端重启后继续有效。

管理员可在台账的预约详情填写原因并取消他人有效预约，不受提前5小时限制；用户收到取消原因的站内通知。会议室密码为编号加1234#（如70811234#），仅成功状态展示，学生须审核通过。详见[取消与密码规则](docs/cancellation-and-access.md)，小程序预约须知已同步。

| 账号 | 密码 | 身份 | 独立管理员授权 |
|---|---|---|---|
| demo-student | student123 | 已核验学生（测试学生甲） | 无 |
| demo-student2 | student123 | 已核验学生（测试学生乙） | 无 |
| demo-teacher | teacher123 | 已核验教师 | 无 |
| demo-admin | admin123 | 已核验学生，仅负责人权限 | 有；自身预约仍待确认 |
| demo-guest | guest123 | 未提交身份 | 无 |

小程序登录页不再展示这批账号，账号密码以本表为准。需要改密码或加账号，改 `server/seed.js` 里的 `demoUsers` 后重新执行 `npm.cmd run db:init`（会覆盖回种子值），再执行 `npm.cmd run db:sql` 同步 SQL 初始化文件。

手机号 `13800000001` 等仅是虚构格式样本，不会发送短信，也不视为验证真实手机号。

## 验证

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run spec:validate
npm.cmd run test:postgres
```

`test` 使用隔离内存 PostgreSQL 测试库，覆盖业务/权限/HTTP、原生 Page 事件对真实接口、WCC 时间条模板渲染。`check` 检查结构、JS/JSON、云函数副本一致性，并运行 WCC/WCSC 编译。`test:postgres` 需要 `TEST_DATABASE_URL` 指向**专用测试库**，未配置会明确跳过；它验证两个独立连接池的数据库行锁，不以 PGlite 单连接测试冒充跨实例验证。结果与未验证项见 [测试报告](docs/test-report.md)。

## 数据库配置

复制 `.env.example` 为 `.env`，设置 `DB_DRIVER=mysql` 及 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`，然后在项目根目录执行 `npm.cmd run db:init`。也可以设置 `MYSQL_URL` 使用完整连接地址。若仅本地演示需要测试账号，显式设置 `ENABLE_DEV_LOGIN=true`（`.env.example` 默认已开）。云环境始终为 `false`。

`db:init` 在 MySQL 下会先连到服务器（不指定库）建库，再交给 `server/schema.mysql.sql` 建表，因此**空机器上是幂等的一条命令**；本地登录校验的是库里 `users` 表的账号密码，不是代码里的静态列表。需要换成纯 SQL 部署或交给 DBA 审阅时，用 `npm.cmd run db:sql` 重新生成 `database/mysql-init.sql`（库名可在命令后追加，如 `npm.cmd run db:sql mrb_demo`）。

改动 `server/seed.js` 里的会议室或演示账号后，`npm test` 会因 SQL 文件未同步而失败，执行 `npm.cmd run db:sql` 重新生成即可。

如果需要把原 `data/local/` 中的 PGlite 数据保留到 MySQL，先完成上面的初始化，再执行 `npm.cmd run db:migrate:mysql`；源目录可通过 `PGLITE_SOURCE_PATH` 修改。迁移脚本按记录主键合并，不删除 MySQL 中已有数据。

如果此前已经按旧版本 JSON schema 创建过 MySQL 数据库，执行 `npm.cmd run db:normalize:mysql` 将旧表转换为规范化字段；迁移前可设置 `KEEP_MYSQL_JSON_BACKUP=true` 保留旧表备份。

项目仍保留 PGlite 和 PostgreSQL 驱动用于旧测试与云函数兼容；需要切回 PGlite 时把 `DB_DRIVER` 改为 `pglite`，需要 PostgreSQL 时改为 `pg` 并设置 `DATABASE_URL`。

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
miniprogram/       18 个原生页面、10 个共享组件、API 适配器、原型素材
server/            共享业务规则、HTTP 开发入口、数据库事务与 schema
cloudfunctions/api/微信云函数及可同步服务端副本
tests/             可执行本地业务、接口、页面和组件测试
tests-postgres/    独立 PostgreSQL 连接池并发测试
openspec/          spec-driven 规格、设计、任务及外部验收待办
design/            原型提取证据、PNG 资源、视觉差异说明
docs/              架构、API、测试报告、验收和四人五周交接
```

本次 UI 精修沿用校园素材和页面结构，设计变量集中在 `miniprogram/styles/tokens.wxss`，新增快捷入口、房间卡片、时间选择、表单、状态标签和反馈六个共享组件。设计依据见[组件规范](design-system/campus-room-booking/MASTER.md)，检查与前后对比见[UI 验证记录](docs/ui-polish-2026-11-23.md)。

项目仓库：[Meeting-Room-Booking-System](https://github.com/eileenjaziham/Meeting-Room-Booking-System)。原型和原始需求保留，本地数据库、私有配置、依赖及工具缓存不入库。四人接手建议和五周安排见 [交接文档](docs/handover.md)。

## 我的、个人信息与反馈

学生在“我的”可进入“个人信息”查看本人姓名、学号、身份类型、电话和核验状态；原有身份认证与审核记录从个人信息页进入。“反馈中心”可选择使用问题、预约问题、功能建议或其他反馈，提交后在“我的反馈”查看记录和回复。反馈按会话归属保存到数据库，管理员在工作台的“用户反馈”中处理。

点击“我的”头像或个人信息页的头像可主动选择并更换图片，压缩后的PNG/JPEG头像按账号保存，重新登录后仍显示；姓名不可自行修改。头像最大64KB，失败或取消保留原头像。预约起止时间使用“小时 / 分钟”双列滚轮，分钟每5分钟一档；小时切换时更新合法分钟，只列出不跨越已有预约的空闲时间。滚动后点击确定才生效，取消保留原时间。

首页日历红点表示本人有待确认或预约成功的记录；取消、拒绝、失效、结束后移除。“我的预约”快捷入口及个人中心显示未读结果提醒，查看对应预约详情后清除，已读状态保存到数据库。管理员首页对预约审核、用户审核、反馈待办显示红点，处理完成后消失。首页可见时每30秒轻量刷新提醒，离开即停止；返回或下拉刷新也会更新。

授权管理员首页顶部提供学生预约审核、预约台账和会议室管理三个入口；工作台显示用户审核、用户反馈及统计，不重复放置学生预约审核。会议室管理打开独立页面，可选择固定五间房间、预览停用影响、确认停用、解除停用并查看记录。停用在同一事务中取消重叠的有效预约并产生本人站内通知；用户在“我的预约”查看取消原因，解除停用不恢复旧预约。普通师生保留日历与房间列表。

“我的”底部展示当前构建版本，当前为 v1.0.0。版本以根目录 package.json 为准；修改后执行 `npm run version:sync`，`npm run check` 会检查版本是否一致。新增反馈表通过重复运行 `npm run db:init` 创建，不覆盖已有预约。运行中的本地服务需重启加载新接口；云环境先更新数据库，再运行 `cloud:prepare` 并重新部署。

## 实现边界

本地 P0 核心及房间停用恢复已实现；真实 AppID、CloudBase、SSO 授权及真机验收仍是外部接入项。停用通知在“我的预约”查看，尚未实现覆盖全部业务事件的独立通知中心、房间资料编辑和完整后台定时整理。五房间课设采用全局数据库锁和全量历史读取，保证规则一致但不适合直接宣称生产吞吐；分页、限流、备份、留存和正式隐私制度需上线前完善。已从原型解压提取五房间配置文字，但未完整解析全部专有图层，图片中合成的校徽/校名作为原始素材保留。
