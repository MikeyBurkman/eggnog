
var eggnog = require('./eggnog.js');

// First demonstrate how an app might use eggnog.
// Create a new eggnog context, and load in all files in the app diretory
var context = eggnog.newContext();
context.scanForFiles('./testapp'); // Load all files in ./testapp

// Assuming one of those modules loaded was desginated as a main module, we can do this.
// The return value is the return value of the init() method on the main module.
var startup = context.main();
console.log('Startup successful: ', startup);
