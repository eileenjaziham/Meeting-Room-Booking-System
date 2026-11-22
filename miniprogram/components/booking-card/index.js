Component({properties:{record:Object},methods:{open(){this.triggerEvent('open',{id:this.data.record.id});}}});
