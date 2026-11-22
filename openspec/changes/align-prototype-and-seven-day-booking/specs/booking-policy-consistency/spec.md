## Purpose
确保用户最新确认的会议室固定资料和七天线上预约窗口在移动端与服务端一致生效，提供不用选择年份的月日星期交互，以及尺寸、线宽、行高和对齐一致的个人中心入口。

## ADDED Requirements
### Requirement: Fixed prototype room data
系统 SHALL 使用7060/7081/7091各10人和屏幕、7052为40人和屏幕、7119为100人和投影音响话筒；现有数据库更新资料不得清空预约。
#### Scenario: Existing database update
- **WHEN** 旧数据库启动新版本
- **THEN** 五房容量设备更新为原型值，既有用户和预约仍保留

### Requirement: Seven-day server window
系统 SHALL 按服务器北京时间仅允许今天尚未开始的时段至今天加7天，学生、教师和管理员的线上提交均不能越过窗口。
#### Scenario: Day seven versus day eight
- **WHEN** 用户提交未来第7天和第8天预约
- **THEN** 第7天按其余规则处理，第8天拒绝并提示联系曹闯老师，QQ28061535

### Requirement: Date weekday without year selection
系统 SHALL 自动显示选中日期的星期，预约日期选择不提供年份滚轮，跨月跨年自动正确处理。
#### Scenario: Cross-year range
- **WHEN** 北京时间12月28日选择含当天的第7天
- **THEN** 选中次年1月3日并显示正确星期，不能选择第8天

### Requirement: Consistent profile menu
系统 SHALL 以统一视框线宽图标、图标容器、行高、双行文字层级和箭头对齐展示个人信息、我的预约、反馈中心和预约须知。
#### Scenario: Student opens profile
- **WHEN** 学生查看我的页面
- **THEN** 各入口图标同尺寸、行高一致、文字左对齐且当前版本可见
