// 只把现有合法时间拆成小时/分钟两列；不自行放宽空闲区间。
function wheel(options,preferred=''){
 const valid=[...new Set((options||[]).filter(value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)&&Number(value.slice(3))%5===0))].sort();
 const hours=[...new Set(valid.map(value=>value.slice(0,2)))];
 if(!hours.length)return {hours:[],minutes:[],range:[[],[]],value:[0,0]};
 const hour=hours.includes(preferred.slice(0,2))?preferred.slice(0,2):hours[0];
 const minutes=valid.filter(value=>value.startsWith(hour+':')).map(value=>value.slice(3));
 const wanted=Number(preferred.slice(3)),minute=minutes.includes(preferred.slice(3))?preferred.slice(3):minutes.reduce((best,value)=>Math.abs(Number(value)-wanted)<Math.abs(Number(best)-wanted)?value:best,minutes[0]);
 return {hours,minutes,range:[hours.map(value=>value+'时'),minutes.map(value=>value+'分')],value:[hours.indexOf(hour),minutes.indexOf(minute)]};
}
function selected(options,hourIndex,minuteIndex){
 const base=wheel(options),hour=base.hours[hourIndex];if(!Number.isInteger(hourIndex)||!Number.isInteger(minuteIndex)||!hour)return '';
 const minutes=wheel(options,hour+':00').minutes,minute=minutes[minuteIndex];return minute===undefined?'':hour+':'+minute;
}
module.exports={wheel,selected};
