const {test}=require('node:test');const assert=require('node:assert/strict');
const {choices,overlap}=require('../miniprogram/utils/availability');
const day='2035-01-02',now=Date.parse('2035-01-01T07:00:00+08:00');
const occupied=[{start:'11:00',end:'12:00'},{start:'09:00',end:'10:30'}];
test('时间每5分钟一档，30分钟空档可以完整预约且不能跨入红色时段',()=>{
 const result=choices(occupied,day,now,'10:30','11:00');
 assert.equal(result.start,'10:30');assert.equal(result.end,'11:00');
 assert.deepEqual(result.endOptions,['10:35','10:40','10:45','10:50','10:55','11:00']);
 for(const blocked of ['09:00','09:15','10:29','11:00','11:59'])assert.ok(!result.startOptions.includes(blocked));
 assert.ok(result.startOptions.includes('10:30'));assert.ok(result.startOptions.includes('12:00'));
 for(const start of result.startOptions){
   const options=choices(occupied,day,now,start,'22:00');
   assert.equal(Number(start.slice(3))%5,0);assert.ok(options.endOptions.length);for(const end of options.endOptions){assert.equal(Number(end.slice(3))%5,0);assert.ok(end>start);assert.ok(!overlap(occupied,start,end),start+'—'+end);}
 }
});
test('当天跳过已过分钟，结束可到22点，已满或已过开放时间没有可选项',()=>{
 let result=choices([],day,Date.parse(day+'T10:30:00+08:00'),'10:30','11:45');
 assert.equal(result.startOptions[0],'10:35');assert.equal(result.startOptions.at(-1),'21:55');assert.equal(result.endOptions.at(-1),'22:00');
 for(const [blocks,clock]of [[[{start:'08:00',end:'22:00'}],now],[[],Date.parse(day+'T22:00:00+08:00')]]){
  result=choices(blocks,day,clock,'09:15','11:45');assert.equal(result.hasAvailable,false);assert.deepEqual(result.startOptions,[]);assert.deepEqual(result.endOptions,[]);
 }
});
test('不足5分钟的零散空档不提供选择，历史分钟级占用不能被跨越',()=>{
 const result=choices([{start:'08:01',end:'12:00'},{start:'12:00',end:'15:00'},{start:'14:00',end:'22:00'}],day,now,'09:15','11:45');
 assert.deepEqual(result.startOptions,[]);assert.deepEqual(result.endOptions,[]);assert.equal(result.hasAvailable,false);
 const gap=choices([{start:'08:00',end:'10:32'},{start:'10:43',end:'22:00'}],day,now,'10:32','10:43');
 assert.deepEqual(gap.startOptions,['10:35']);assert.deepEqual(gap.endOptions,['10:40']);
 const full=choices([],day,now,'09:15','11:45');assert.equal(full.startOptions.length,168);
});
test('09:15已有预约：今天08:43从08:45选起，明天仍可从08:00选起',()=>{
 const clock=Date.parse('2035-01-02T08:43:00+08:00'),blocks=[{start:'09:15',end:'11:45'}];
 const today=choices(blocks,'2035-01-02',clock,'09:15','11:45');
 assert.equal(today.earliestStart,'08:45');assert.equal(today.start,'08:45');assert.deepEqual(today.endOptions,['08:50','08:55','09:00','09:05','09:10','09:15']);
 const tomorrow=choices(blocks,'2035-01-03',clock,'09:15','11:45');
 assert.equal(tomorrow.earliestStart,'08:00');assert.equal(tomorrow.start,'08:00');assert.ok(tomorrow.endOptions.includes('09:15'));
});
