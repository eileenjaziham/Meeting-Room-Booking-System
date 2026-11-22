const pad = x => String(x).padStart(2,'0');
const policy = require('../booking-policy');
const DAY = 86400000;
const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
function today(now = Date.now()) { const d = new Date(now + 8*3600000); return d.toISOString().slice(0,10); }
function addDays(day, offset) { return new Date(Date.parse(day + 'T00:00:00+08:00') + offset * DAY + 8 * 3600000).toISOString().slice(0,10); }
function weekday(day) { return weekdays[new Date(day + 'T12:00:00+08:00').getUTCDay()]; }
function label(day) { const parts=day.split('-');return Number(parts[1])+'月'+Number(parts[2])+'日 '+weekday(day); }
function options(first = today()) { return Array.from({ length: policy.bookingDays }, (_,i) => { const date=addDays(first,i);return { date, label: label(date) + (i===0?'（今天）':'') }; }); }
function calendar(year, month, selected, first = today()) {
  const firstWeekday = new Date(Date.UTC(year,month-1,1)).getUTCDay();
  const length = new Date(Date.UTC(year,month,0)).getUTCDate();
  const result = Array.from({length:firstWeekday}, (_,i)=>({key:'empty'+i,blank:true}));
  const last = addDays(first, policy.maxAdvanceDays);
  for(let i=1;i<=length;i++){const value=year+'-'+pad(month)+'-'+pad(i);result.push({key:value,day:i,date:value,selected:value===selected,today:value===first,disabled:value<first||value>last});}
  return result;
}
module.exports = { today, calendar, pad, addDays, weekday, label, options };
