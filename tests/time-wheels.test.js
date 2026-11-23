const {test}=require('node:test'),assert=require('node:assert/strict');
const {wheel,selected}=require('../miniprogram/utils/time-wheels'),{choices,overlap}=require('../miniprogram/utils/availability');
const day='2035-01-02',now=Date.parse('2035-01-01T07:00:00+08:00');

test('小时分钟拆为两列，分钟5分钟一档，结束22点只有00分',()=>{
 const available=choices([],day,now,'14:30','17:50'),start=wheel(available.startOptions,available.start),end=wheel(available.endOptions,'22:00');
 assert.deepEqual(start.range[1],['00分','05分','10分','15分','20分','25分','30分','35分','40分','45分','50分','55分']);assert.equal(start.hours[start.value[0]],'14');assert.equal(start.minutes[start.value[1]],'30');
 assert.deepEqual(end.minutes,['00']);assert.equal(selected(available.endOptions,...end.value),'22:00');assert.ok(!start.hours.includes('22'));
});

test('小时切换时只提供该小时的空闲分钟，跨占用的结束选项不会出现',()=>{
 const occupied=[{start:'09:15',end:'11:45'}],available=choices(occupied,day,now,'08:00','09:15');
 assert.equal(available.start,'08:00');assert.ok(!wheel(available.startOptions,'10:00').hours.includes('10'));
 assert.deepEqual(wheel(available.startOptions,'09:30').minutes,['00','05','10']);assert.deepEqual(wheel(available.startOptions,'11:00').minutes,['45','50','55']);
 assert.deepEqual(wheel(available.endOptions,'09:15').minutes,['00','05','10','15']);
 for(const start of available.startOptions){const options=choices(occupied,day,now,start,'22:00').endOptions,base=wheel(options);for(let h=0;h<base.hours.length;h++){const minutes=wheel(options,base.hours[h]+':00').minutes;for(let m=0;m<minutes.length;m++){const end=selected(options,h,m);assert.ok(options.includes(end));assert.ok(!overlap(occupied,start,end));}}}
});

test('当天跳过已过时刻，无可选时间及非法列下标安全返回空值',()=>{
 const available=choices([],day,Date.parse(day+'T08:43:00+08:00'),'08:00','09:00'),start=wheel(available.startOptions,'08:00');assert.deepEqual(start.minutes,['45','50','55']);assert.equal(selected(available.startOptions,0,0),'08:45');
 assert.deepEqual(wheel([],''),{hours:[],minutes:[],range:[[],[]],value:[0,0]});for(const [h,m]of [[-1,0],[0,99],[1.5,0],[0,-1]])assert.equal(selected(available.startOptions,h,m),'');assert.equal(selected([],0,0),'');
});
