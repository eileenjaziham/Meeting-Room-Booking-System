const path=require('node:path');const vm=require('node:vm');const fs=require('node:fs');
const compiler=require('miniprogram-compiler');
const root=path.resolve(__dirname,'../miniprogram');
const wxml=compiler.wxmlToJs(root);new vm.Script('(function(){'+wxml+'})');
// 包装库在 WCSC 返回 Error 时会抛无关 TypeError，先保留原生错误信息。
const glob=require('glob');const result=require('miniprogram-compiler/src/wcsc')(root,glob.sync('**/*.wxss',{cwd:root}).map(x=>x.slice(0,-5)));
if(result instanceof Error)throw result;
const wxss=compiler.wxssToJs(root);new vm.Script('(function(){'+wxss+'})');
let pages=JSON.parse(fs.readFileSync(path.join(root,'app.json'))).pages.length;
console.log('WCC / WCSC 编译通过：'+pages+' 页面和共享组件（编译器 '+require('miniprogram-compiler/package.json').version+'；不等同微信开发者工具/真机验收）。');
