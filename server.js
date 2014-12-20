
var NOD = require('./index.js')();

NOD.scanForFiles('./testapp');

var startup = NOD.loadModule('appstart');
console.log('Startup successful: ', startup);