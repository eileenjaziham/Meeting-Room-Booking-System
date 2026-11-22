const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('package.json 版本格式无效');
fs.writeFileSync(path.join(__dirname, '../miniprogram/version.js'), '// 构建版本来自根目录 package.json；修改版本后运行 npm run version:sync。\nmodule.exports = ' + JSON.stringify({ version }) + ';\n');
console.log('小程序版本已同步：v' + version);
