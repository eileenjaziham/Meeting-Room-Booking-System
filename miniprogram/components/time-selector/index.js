const wheels=require('../../utils/time-wheels');
Component({
 properties:{dateOptions:Array,dateIndex:Number,dateLabel:String,startOptions:Array,endOptions:Array,startIndex:Number,endIndex:Number,start:String,end:String,occupied:Array,disabled:Boolean,hasAvailable:Boolean,isToday:Boolean,earliestStart:String},
 data:{startWheel:{hours:[],minutes:[],range:[[],[]],value:[0,0]},endWheel:{hours:[],minutes:[],range:[[],[]],value:[0,0]}},
 observers:{'startOptions,start':function(){this.syncWheel('start');},'endOptions,end':function(){this.syncWheel('end');}},
 methods:{
  syncWheel(field){this.setData({[field+'Wheel']:wheels.wheel(this.data[field+'Options'],this.data[field])});},
  date(e){if(!this.data.disabled)this.triggerEvent('datechange',{value:e.detail.value});},
  column(e){
   const field=e.currentTarget.dataset.field;if(this.data.disabled||!['start','end'].includes(field))return;
   const column=Number(e.detail.column),index=Number(e.detail.value),current=this.data[field+'Wheel'];if(!Number.isInteger(index))return;
   if(column===0&&current.hours[index]){const minute=current.minutes[current.value[1]]||'00';this.setData({[field+'Wheel']:wheels.wheel(this.data[field+'Options'],current.hours[index]+':'+minute)});}
   if(column===1&&current.minutes[index])this.setData({[field+'Wheel']:{...current,value:[current.value[0],index]}});
  },
  cancel(e){const field=e.currentTarget.dataset.field;if(['start','end'].includes(field))this.syncWheel(field);},
  time(e){
   const field=e.currentTarget.dataset.field,value=e.detail.value;if(this.data.disabled||!['start','end'].includes(field)||!Array.isArray(value)||value.length!==2)return;
   const options=this.data[field+'Options']||[],selected=wheels.selected(options,Number(value[0]),Number(value[1])),index=options.indexOf(selected);
   if(index>=0)this.triggerEvent('timechange',{field,value:index});
   this.syncWheel(field);
  }
 }
});
