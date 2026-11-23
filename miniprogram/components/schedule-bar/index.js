function minute(t){const parts=t.split(':');return Number(parts[0])*60+Number(parts[1]);}
function layout(value){
  const periods=(value||[]).slice().sort((a,b)=>minute(a.start)-minute(b.start));
  const segments=periods.map(x=>({start:x.start,end:x.end,left:(minute(x.start)-480)/840*100,width:(minute(x.end)-minute(x.start))/840*100}));
  // 相隔过近的内部边界一起省略，例如 10:30 结束、11:00 开始。
  const spacing=75, candidates=[];
  periods.forEach((period,index)=>{
    const start=minute(period.start),end=minute(period.end);
    if(index===0||start-minute(periods[index-1].end)>spacing)candidates.push({time:period.start,minute:start});
    if(index===periods.length-1||minute(periods[index+1].start)-end>spacing)candidates.push({time:period.end,minute:end});
  });
  const rows=[],labels=candidates.map(item=>{
    let row=rows.findIndex(last=>item.minute-last>=spacing);if(row<0)row=rows.length;
    rows[row]=item.minute;
    return {time:item.time,left:(item.minute-480)/840*100,top:row*24,shift:item.minute<515?'0%':item.minute>1285?'-100%':'-50%'};
  });
  return {segments,labels,labelHeight:rows.length*24};
}
Component({properties:{occupied:{type:Array,value:[],observer(value){this.setData(layout(value));this.updateSelection();}},detail:{type:Boolean,value:false},selectedStart:{type:String,value:'',observer(){this.updateSelection();}},selectedEnd:{type:String,value:'',observer(){this.updateSelection();}}},data:{segments:[],labels:[],labelHeight:0,selected:null},methods:{updateSelection(){const start=this.data.selectedStart,end=this.data.selectedEnd;const valid=/^\d{2}:\d{2}$/.test(start)&&/^\d{2}:\d{2}$/.test(end)&&start>='08:00'&&end<='22:00'&&start<end&&!(this.data.occupied||[]).some(x=>start<x.end&&end>x.start);this.setData({selected:valid?{left:(minute(start)-480)/840*100,width:(minute(end)-minute(start))/840*100}:null});}}});
