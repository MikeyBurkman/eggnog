
import Utils = require('./Utils');
import EggnogModule = require("./EggnogModule");
import ContextImpl = require("./ContextImpl");
import path = require('path');

class SingleModuleContext {

	private rootDir: string;

	constructor(rootDir: string) {
		this.rootDir = rootDir;
	}

	buildModule<T>(moduleId: string, opts?: {
									locals?: {[id: string]: any},
									externals?: {[id: string]: any},
									globals?: {[id: string]: any}}): T {
		opts = opts || {};
		var locals = opts.locals || {};
		var externals = opts.externals || {};
		var globals = opts.globals || {};

		var externalResolverFn = function(id: string) {
			// TODO: Add suggestions if they're missing an import
			if (!externals.hasOwnProperty(id)) {
				throw 'External dependency [' + id + '] was not satisfied for module: [' + moduleId + ']';
			}
			return externals[id];
		};

		var globalResolverFn = function(id: string) {
			// TODO: Suggestions if they forgot/misspelled a global
			if (!globals.hasOwnProperty(id)) {
				throw 'Global dependency [' + id + '] was not satisfied for module: [' + moduleId + ']';
			}
			return globals[id];
		}

		var ctx = new ContextImpl(undefined, externalResolverFn, globalResolverFn);

		// Add each of the provided locals to the context so it's available when we load the actual module below.
		Utils.each(locals, function(val, id) {
			ctx.addMapping({
				_id: id,
				init: function() { return val; }
			});
		});

		var fname = path.join(this.rootDir, Utils.directoryFromModuleId(moduleId) + '.js');
		var m:EggnogModule = require(fname);
		m._id = moduleId;
		var mapping = ctx.addMapping(m, undefined, fname);
		return ctx.loadModule(mapping.id);
	}

}

export = SingleModuleContext;
