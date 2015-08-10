
module.exports = {
	newContext: newContext,
	newSingleModuleContext: newSingleModuleContext,
	fileFilters: createFileFilters()
};

var context = require('./src/context');
var utils = require('./src/utils.js');
var singleModuleContext = require('./src/singleModuleContext.js');

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
	if (typeof(opts) === 'string') {
		opts = {
			nodeModulesAt: opts
		};
	}

	return context.create(opts);
}

function newSingleModuleContext(rootDir) {
	return singleModuleContext.create(rootDir);
}
