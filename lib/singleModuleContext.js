
var utils = require('./utils.js');
var context = require('./context.js');
var path = require('path');

module.exports = {
	create: create
};

function create(rootDir) {
	return {
		buildModule: buildModule
	};

	function buildModule(moduleId, opts) {
		opts = opts || {};
		var locals = opts.locals || {};
		var externals = opts.externals || {};
		var globals = opts.globals || {};

		var ctx = context.create({
			externalResolverFn: function(id) {
				// Specify an external resolver that 
				// TODO: Add suggestions if they're missing an import
				if (!externals.hasOwnProperty(id)) {
					throw 'External dependency [' + id + '] was not satisfied for module: [' + fname + ']';
				}
				return externals[id];
			},
			globalResolverFn: function(globalId) {
				// For single modules, we expect them to provide a mapping of globals
				// TODO: Suggestions if they forgot/misspelled a global
				if (!globals.hasOwnProperty(globalId)) {
					var msg = 'Could '
					var keys = utils.objectKeys(globals);
					var similar = utils.findSimilar(globalId, keys);

				}
				return globals[globalId];
			}
		});

		utils.each(locals, function(val, id) {			
			ctx.addMapping({
				_id: id,
				init: function() { return val; }
			});
		});

		var fname = path.join(rootDir, utils.directoryFromModuleId(moduleId) + '.js');
		var m = require(fname);
		m._id = moduleId;
		var mapping = ctx.addMapping(m, undefined, fname);
		return ctx.loadModule(mapping.id);
	}
};