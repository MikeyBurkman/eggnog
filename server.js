
var NOD = require('./index.js')();

NOD.scanForFiles('./testapp'); // Load all files in ./testapp

// This is the module to start in. Returns the return value of appstart.init()
//var startup = NOD.loadModule('appstart');
var startup = NOD.startApp();
console.log('Startup successful: ', startup);