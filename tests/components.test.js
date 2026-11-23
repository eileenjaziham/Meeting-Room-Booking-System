const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
test('真实 WCC 模板渲染：占用条精准分钟及日期清空后的空状态',async()=>{
 const {JSDOM}=require('jsdom');const dom=new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
 global.window=dom.window;global.document=dom.window.document;global.Element=dom.window.Element;global.Event=dom.window.Event;global.HTMLElement=dom.window.HTMLElement;global.getComputedStyle=dom.window.getComputedStyle;
 const simulate=require('miniprogram-simulate');const root=path.resolve('miniprogram');
 const id=simulate.load(path.join(root,'components/schedule-bar/index'),{rootPath:root});
 const component=simulate.render(id,{occupied:[{start:'14:30',end:'17:50',label:'已占用'}],detail:true});component.attach(document.createElement('div'));
 assert.equal(component.instance.data.segments.length,1);assert.ok(Math.abs(component.instance.data.segments[0].left-46.428571)<0.0001);assert.match(component.dom.textContent,/14:30/);assert.match(component.dom.textContent,/17:50/);
 assert.equal(component.querySelectorAll('.edge-label').length,2);assert.equal(component.querySelectorAll('.occupied-time').length,0);
 assert.ok(Math.abs(component.instance.data.labels[1].left-70.238095)<0.0001);
 component.setData({detail:false,occupied:[{start:'09:00',end:'10:30'},{start:'11:00',end:'12:30'}]});await simulate.sleep(0);
 assert.deepEqual(component.instance.data.labels.map(x=>x.time),['09:00','12:30']);assert.equal(component.instance.data.segments.length,2);assert.equal(component.instance.data.labelHeight,24);
 component.setData({occupied:[{start:'08:01',end:'08:02'}]});await simulate.sleep(0);
 assert.deepEqual(component.instance.data.labels.map(x=>x.time),['08:01','08:02']);assert.equal(component.instance.data.labelHeight,48);
 component.setData({detail:true});
 component.setData({occupied:[]});await simulate.sleep(0);assert.equal(component.instance.data.segments.length,0);assert.match(component.dom.textContent,/当日暂无占用/);
 component.detach();dom.window.close();
});
