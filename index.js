
module.exports = {
	newContext: newContext, 
	newSingleModuleContext: newSingleModuleContext,
	fileFilters: createFileFilters()
};

var context = require('./lib/context');
var utils = require('./lib/utils.js');
var singleModuleContext = require('./lib/singleModuleContext.js');

function createFileFilters() {
	return {
		onlyIndexJs: function(fname) {
			return !utils.strEndsWith(fname, '/index.js');
		},
		notIndexJs: function(fname) {
			return utils.strEndsWith(fname, '/index.js');
		}
	};
}

function newContext(opts) {
	opts = opts || {};
	var ctxOpts = {
		nodeModulesAt: opts.nodeModulesAt
	};
	return context.create(ctxOpts);
}

function newSingleModuleContext(rootDir) {
	return singleModuleContext.create(rootDir);
}


