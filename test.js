
var NOD = require('./index.js');

NOD('testapp').then(function(start) {
	start('appStart');
}).catch(function(ex) {
	console.log('Could not load modules: ', ex);
})