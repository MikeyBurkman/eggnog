
import Utils = require('./utils');
import context = require('./context');
import path = require('path');

export interface SingleModuleConstructorArgs {
	locals?: {[id: string]: any};
	externals?: {[id: string]: any};
	globals?: {[id: string]: any};
}

export class SingleModuleContext {

	private rootDir: string;

	constructor(rootDir: string) {
		this.rootDir = rootDir;
	}

	buildModule<T>(moduleId: string, opts?: SingleModuleConstructorArgs): T {
		opts = opts || {};
		var locals = opts.locals || {};
		var externals = opts.externals || {};
		var globals = opts.globals || {};

		var ctx = new context.Context({
			externalResolverFn: function(id) {
				// TODO: Add suggestions if they're missing an import
				if (!externals.hasOwnProperty(id)) {
					throw 'External dependency [' + id + '] was not satisfied for module: [' + moduleId + ']';
				}
				return externals[id];
			},
			globalResolverFn: function(id) {
				// TODO: Suggestions if they forgot/misspelled a global
				if (!globals.hasOwnProperty(id)) {
					throw 'Global dependency [' + id + '] was not satisfied for module: [' + moduleId + ']';
				}
				return globals[id];
			}
		});

		// Add each of the provided locals to the context so it's available when we load the actual module below.
		Utils.each(locals, function(val, id) {
			ctx.addMapping({
				_id: id,
				init: function() { return val; }
			});
		});

		var fname = path.join(this.rootDir, Utils.directoryFromModuleId(moduleId) + '.js');
		var m = require(fname);
		m._id = moduleId;
		var mapping = ctx.addMapping(m, undefined, fname);
		return ctx.loadModule(mapping.id);
	}

}
