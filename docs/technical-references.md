# 技术依据与版本

查阅日期：2026-11-22。可重复安装版本由根目录及云函数目录 package-lock.json 锁定。

| 项 | 实际版本/用途 | 官方依据 |
|---|---|---|
| Node.js | 本机22.19.0，工程要求≥22 | [Node.js API](https://nodejs.org/docs/latest-v22.x/api/) |
| OpenSpec | 2.0.0；spec-driven，init/new change/status/instructions/validate | [官方 CLI](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md) |
| CloudBase PostgreSQL | 未配置云环境；采用 PostgreSQL 协议服务端 pg 接入 | [连接数据库](https://docs.cloudbase.net/database/postgresql/connecting-to-postgresql) |
| 微信云函数 | wx-server-sdk 3.0.1；getWXContext可信身份 | [小程序调用云函数](https://docs.cloudbase.net/recipes/add-cloud-function-wechat-miniprogram) |
| PostgreSQL | 本地独立测试集群16；READ COMMITTED + FOR UPDATE | [显式锁](https://www.postgresql.org/docs/current/explicit-locking.html)、[隔离级别](https://www.postgresql.org/docs/current/transaction-iso.html) |
| PGlite | 0.5.17，持久化本地开发和隔离测试 | [官方仓库](https://github.com/electric-sql/pglite) |
| pg | 8.23.1，本地/云端PostgreSQL协议 | [node-postgres](https://node-postgres.com/) |
| 模板编译 | miniprogram-compiler 0.2.3；WCC/WCSC 独立编译验证 | [微信官方组件测试仓库](https://github.com/wechat-miniprogram/miniprogram-simulate)使用其编译接口；不等同当前开发者工具完整构建 |
| 组件测试 | miniprogram-simulate 1.7.0 + jsdom | [官方组件测试工具](https://github.com/wechat-miniprogram/miniprogram-simulate) |
| 小程序时间选择 | 原生 picker mode=time，非固定档位 | [微信 picker 文档](https://developers.weixin.qq.com/miniprogram/dev/component/picker.html)（本次网页抓取受限；仍需开发者工具核对目标基础库） |

CloudBase 当前提供 PG 环境及 PostgreSQL 协议连接，因此选用 pg 事务实现一致性；没有把 PostgREST 的多个独立请求拼成伪事务。真实环境仍需核对接入地址、网络、TLS证书、角色权限和可用Node运行时。云函数的 OPENID 使用平台调用链，不从客户端 payload 获取。

OpenSpec 保留四项真实变更与未完成的外部验收任务，未未经验证强行归档。没有把文档工件代替服务端实现。
