## Purpose

提供学院五间指定会议室的可信资料与按日期查询的占用快照，沿用已有校园背景和蓝白卡片原型，让师生能够选择合法的分钟级时间，同时保护其他申请人的身份及用途信息。

## ADDED Requirements

### Requirement: Five rooms follow requirement baseline
系统 SHALL 显示 7060、7081、7091、7119、7052，容量分别为未知、12、12、80、35；未核实设备不得伪造。

#### Scenario: Unknown resource data
- **WHEN** 用户查看 7060 资料
- **THEN** 容量与设备显示待核实，不能把原型示例人数当正式容量

### Requirement: Daily private occupancy snapshot
系统 SHALL 按日期返回待确认和成功预约的占用，仅暴露起止时间；查询不锁定时段。

#### Scenario: Change selected date
- **WHEN** 用户从有预约的日期切换到无预约日期
- **THEN** 时间条同步清空该房间占用且不暴露其他申请人的姓名、电话或用途

### Requirement: Prototype-based interactive mobile layout
系统 SHALL 使用独立素材和交互元素呈现校园背景、三快捷入口、日历、会议室卡片和首页/我的导航，支持手机竖屏。

#### Scenario: Open room and choose minutes
- **WHEN** 用户点击房间卡片进入详情
- **THEN** 可以查看当天占用并用分钟级选择器选择例如 14:30—17:50
