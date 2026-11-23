// 半开区间：相邻时段可以衔接，任意一分钟重叠都不可预约。
function overlap(occupied, start, end) {
  return (occupied || []).find(item => start < item.end && end > item.start);
}
function message(period) {
  return period.start + '—' + period.end + (period.label==='停用'?' 会议室停用，请选择其他空闲时段':' 已被预约，请选择其他空闲时段');
}
function minute(time){return Number(time.slice(0,2))*60+Number(time.slice(3));}
function time(value){return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
function freePeriods(occupied,date,now){
  const midnight=Date.parse(date+'T00:00:00+08:00');
  let cursor=Math.max(480,Math.floor((now-midnight)/60000)+1);
  if(!Number.isFinite(cursor)||cursor>=1320)return [];
  const result=[];
  for(const item of (occupied||[]).slice().sort((a,b)=>a.start.localeCompare(b.start))){
    const start=Math.max(480,minute(item.start)),end=Math.min(1320,minute(item.end));
    if(end<=cursor||start>=1320)continue;
    if(start>cursor)result.push({start:cursor,end:start});
    cursor=Math.max(cursor,end);
  }
  if(cursor<1320)result.push({start:cursor,end:1320});
  return result;
}
function choices(occupied,date,now,preferredStart,preferredEnd){
  const periods=freePeriods(occupied,date,now),startOptions=[];
  for(const period of periods)for(let value=Math.ceil(period.start/5)*5;value+5<=period.end;value+=5)startOptions.push(time(value));
  const start=startOptions.includes(preferredStart)?preferredStart:(startOptions[0]||'');
  const period=periods.find(item=>minute(start)>=item.start&&minute(start)<item.end),endOptions=[];
  if(period)for(let value=minute(start)+5;value<=period.end;value+=5)endOptions.push(time(value));
  const end=endOptions.includes(preferredEnd)?preferredEnd:(period?time(Math.min(minute(start)+60,Math.floor(period.end/5)*5)):'');
  return {start,end,startOptions,endOptions,startIndex:Math.max(0,startOptions.indexOf(start)),endIndex:Math.max(0,endOptions.indexOf(end)),hasAvailable:!!startOptions.length,earliestStart:startOptions[0]||''};
}
module.exports = { overlap, message, freePeriods, choices };
