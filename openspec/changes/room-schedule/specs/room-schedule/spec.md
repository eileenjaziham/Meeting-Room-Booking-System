## Purpose

提供学院五间指定会议室的可信资料与按日期查询的占用快照，沿用已有校园背景和蓝白卡片原型，让师生能够选择合法的分钟级时间，同时保护其他申请人的身份及用途信息。

## ADDED Requirements

### Requirement: Five rooms follow requirement baseline
系统 SHALL 按2026-11-23用户确认的原型显示7060/7081/7091各10人、屏幕，7119为100人、投影/音响/话筒，7052为40人、屏幕。

#### Scenario: Fixed resource data
- **WHEN** 用户查看 7060 资料
- **THEN** 容量显示10人、设备屏幕，不显示待核实

### Requirement: Daily private occupancy snapshot
系统 SHALL 按日期返回待确认和成功预约的占用，仅暴露起止时间；查询不锁定时段。

#### Scenario: Change selected date
- **WHEN** 用户从有预约的日期切换到无预约日期
- **THEN** 时间条同步清空该房间占用且不暴露其他申请人的姓名、电话或用途

### Requirement: Prototype-based interactive mobile layout
系统 SHALL 使用独立素材和交互元素呈现校园背景、三快捷入口、日历、会议室卡片和首页/我的导航，支持手机竖屏。

#### Scenario: Open room and choose minutes
- **WHEN** 用户点击房间卡片进入详情
- **THEN** 可以查看当天占用并用5分钟一档的选择器选择例如14:30—17:50

### Requirement: Thin timeline with boundary labels
系统 SHALL 保持时间条12rpx细度，仅在红色占用段对应的起止位置标注时间，不在下方另列占用区间；相邻占用之间过近的两个内部标签同时省略，短占用段的自身起止标签错行避免重叠。

#### Scenario: Short free gap between meetings
- **WHEN** 前一个会议10:30结束、后一个会议11:00开始
- **THEN** 两段红色仍准确显示，省略10:30和11:00两个过近的标签，保留外侧边界时间

### Requirement: Select only free minutes
系统 SHALL 只提供未占用且晚于当前北京时间的5分钟刻度（00、05、10……55）；结束时间必须晚于开始且处于同一连续空闲区间，不得跨越待确认或成功预约；不足5分钟或没有完整5分钟刻度的空档不提供选项，历史分钟级预约的占用仍准确保留。继续填写与最终提交时仍刷新并校验最新占用。

#### Scenario: Reserve a thirty-minute gap
- **WHEN** 用户选择10:30为开始，且11:00已有会议开始
- **THEN** 结束选项仅含10:35、10:40、10:45、10:50、10:55、11:00，允许衔接边界，不能选择跨过11:00的结束时间

#### Scenario: Fully booked date
- **WHEN** 当日开放时间已被占满或全部已过
- **THEN** 不提供时间选项，并提示用户选择其他日期

#### Scenario: Explain today's earliest start
- **WHEN** 今天北京时间08:43，09:15—11:45已有预约
- **THEN** 今天最早可选08:45并显示过去时段不可预约的提示；同样占用发生在明天时仍可从08:00选择
