const labels={pending:'待确认',approved:'预约成功',rejected:'已拒绝',cancelled:'已取消',expired:'已失效',completed:'已完成'};
Component({properties:{status:{type:String,value:'',observer(value){this.setData({fallbackLabel:labels[value]||'状态未知'});}},label:{type:String,value:''}},data:{fallbackLabel:'状态未知'}});
