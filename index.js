
module.exports = {
	newContext: newContext, 
	singleModule: singleModule,
	fileFilters: createFileFilters()
};

var context = require('./context');
var utils = require('./utils.js');

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
		externalRoot: opts.externalRoot
	};
	return context.create(ctxOpts);
}

function singleModule(fname, opts) {
	opts = opts || {};
	var localImports = opts.imports || {};
	var extImports = opts.extImports || {};

	var ctx = context.create({
		externalResolverFn: function(id) {
			// Specify an external resolver that 
			// TODO: Add suggestions if they're missing an import
			if (!extImports.hasOwnProperty(id)) {
				throw 'External dependency [' + id + '] was not satisfied for module: [' + fname + ']';
			}
			return extImports[id];
		}
	});

	utils.each(localImports, function(val, id) {			
		ctx.addMapping({
			_id: id,
			init: function() { return val; }
		});
	});

	var m = require(fname);
	var mapping = ctx.addMapping(m, undefined, fname);
	return ctx.loadModule(mapping.id);
}


