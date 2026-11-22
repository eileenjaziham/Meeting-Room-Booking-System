function minute(t){const parts=t.split(':');return Number(parts[0])*60+Number(parts[1]);}
Component({ properties:{ occupied:{type:Array,value:[],observer(value){this.setData({segments:(value||[]).map(x=>({start:x.start,end:x.end,left:(minute(x.start)-480)/840*100,width:(minute(x.end)-minute(x.start))/840*100}))});}}, detail:{type:Boolean,value:false} },data:{segments:[]} });
