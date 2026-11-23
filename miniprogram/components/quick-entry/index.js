Component({properties:{label:String,icon:String,tone:{type:String,value:'blue'},badge:Boolean},methods:{select(){this.triggerEvent('select');}}});
