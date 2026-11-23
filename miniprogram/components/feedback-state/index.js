Component({properties:{kind:{type:String,value:'empty'},title:String,description:String,actionLabel:String},data:{skeletons:[1,2]},methods:{action(){this.triggerEvent('action');}}});
