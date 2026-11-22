const pad = x => String(x).padStart(2,'0');
function today() { const d = new Date(Date.now() + 8*3600000); return d.toISOString().slice(0,10); }
function calendar(year, month, selected) {
  const first = new Date(Date.UTC(year,month-1,1)).getUTCDay();
  const length = new Date(Date.UTC(year,month,0)).getUTCDate();
  const result = Array.from({length:first}, (_,i)=>({key:'empty'+i,blank:true}));
  for(let i=1;i<=length;i++){const value=year+'-'+pad(month)+'-'+pad(i);result.push({key:value,day:i,date:value,selected:value===selected,today:value===today()});}
  return result;
}
module.exports = { today, calendar, pad };
