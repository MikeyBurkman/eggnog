
import Context = require('./Context');
import Utils = require('./Utils');
import fileScanner = require('./fileScanner');
import Resolver = require('./Resolver');
import ResolvedModule = require('./ResolvedModule');
import Scope = require('./Scope');
import EggnogModule = require("./EggnogModule");
import EnumExt = require('./EnumExt');

import fs = require('fs');
import path = require('path');

var scopeNames = EnumExt.getNames(Scope);

class ContextImpl implements Context {
	private nodeModulesAt: string;
	private externalResolverFn(id: string): any {
		return undefined;
	}
	private globalResolverFn(id: string): any {
		return undefined;
	}

	// List of properties allowed in module.exports.
	// These are not necessarily required. They are mostly to detect typos.
	private static validMappingProperties = [
		'_id',
		'locals',
		'externals',
		'globals',
		'init',
		'scope',
		'isMain'
	];

	//// Local variables ////

	private mappings: {[id: string]: ResolvedModule} = {};
	private extMappings = {};
	private mainModule: string = undefined;

	// Contains modules already resolved (so we don't call init twice)
	private resolved: {[id: string]: any} = {};

	// Contains modules being resolved currently.
	// This allows us to detect circular dependencies.
	private resolving: Array<string> = [];

	constructor(nodeModulesAt?: string, externalResolverFn?: (id: string) => any, globalResolverFn?: (id: string) => any) {
		var self = this;
		this.nodeModulesAt = nodeModulesAt;
		this.externalResolverFn = externalResolverFn || function() { return self.loadExternalFromRequire.apply(self, arguments); };
		this.globalResolverFn = globalResolverFn || this.nodeJsGlobalResolver;
	}

	// Public API (not all are on the interface)

	getMainModuleId() {
		return this.mainModule;
	}

	main(): any {
		if (!this.mainModule) {
			throw 'No main module was found';
		}
		return this.loadModule(this.mainModule);
	}

	addDirectory(baseDir: string): Array<string> {
		var loaded = fileScanner.scan({
			baseDir: baseDir
		});
		var included: Array<string> = [];
		loaded.forEach((res) => {
			included.push(res.fileName);
			this.addMapping(res.loadedModule, undefined, res.directory);
		});

		return included;
	}

	addMapping(eggnogModule: EggnogModule, idPrefix?: string, directory?: string): ResolvedModule {
		this.verifyMappingProperties(eggnogModule);

		// _id overrides a built ID -- internal use only
		var id = eggnogModule._id || Utils.moduleIdFromDirectory(directory, idPrefix);

		var deps = eggnogModule.locals || [];
		var init = eggnogModule.init;
		var isMain = eggnogModule.isMain;
		var scope = eggnogModule.scope || Scope.Singleton;
		var externals = eggnogModule.externals || [];
		var globals = eggnogModule.globals || [];

		var scopeName = EnumExt.getName(Scope, scope);
		if (!Utils.contains(scopeNames, scopeName)) {
			var msg = 'Unrecognized scope: [' + scope + '] for ID [' + id + ']';
			throw buildMissingDepMsg(msg, scopeName, scopeNames);
		}

		var normId = normalizeId(id);

		if (this.mappings[normId]) {
			var msg = 'Error: Already had mapping for [' + id + ']';
			var otherDir = this.mappings[normId].dir;
			if (otherDir) {
				msg += ' ; see [' + otherDir + ']'
			}
			throw msg;
		}

		var mapping:ResolvedModule = {
			id: id,
			dir: directory,
			deps: deps,
			scope: scope,
			externals: externals,
			globals: globals,
			init: init
		};

		this.mappings[normId] = mapping;

		if (isMain) {
			if (this.mainModule) {
				throw 'Could not make [' + id + '] the main module; [' + this.mainModule + '] was already defined as the main module';
			}
			this.mainModule = id;
		}

		return mapping;
	}

	loadModule(id: string, parent?: ResolvedModule): any  {

		var normId = normalizeId(id);
		var m = this.mappings[normId];

		if (!m) {
			var msg = 'Could not find dependency [' + id + ']'
			if (parent) {
				msg += ' in dependencies for [' + parent.id + ']';
			}
			throw buildMissingDepMsg(msg, id, this.findSimilarMappings(id));
		}

		var moduleResult: any;

		// Only resolve each module if we haven't already
		if (this.resolved[normId]) {
			moduleResult = this.resolved[normId];

		} else {

			// Detect circular dependencies --> see if were already trying to resolve this id
			if (Utils.contains(this.resolving, normId)) {
				this.resolving.push(normId); // Add it to make the message better
				while (this.resolving[0] !== normId) {
					// Remove any past dependencies, just to make the message simpler.
					// This will show exactly where the circular dependency is.
					// (Just remove it and look at the message to understand why it's here.)
					this.resolving.shift();
				}
				var msg = 'Circular dependency detected! [' + this.resolving.join(' -> ') + ']';
				throw msg;
			}

			// Currently resolving this id
			this.resolving.push(normId);

			var resolvedDeps: {[id: string]: any} = {};
			Utils.each(m.deps, function(dep) {
				dep = normalizeId(dep);
				resolvedDeps[dep] = this.loadModule(dep, m);
			}, this);

			var resolver = new ResolverImpl(m, resolvedDeps, this.externalResolverFn, this.globalResolverFn);

			moduleResult = m.init(resolver);

			if (moduleResult === undefined) {
				moduleResult = resolver.exports;
			}

			// This ID resolved, so pop the last item (normId) from the resolving stack
			this.resolving.pop();

			// Mark that we've resolved this module.
			// If a module is a singleton, we cache it so we don't re-resolve it next time
			if (m.scope === Scope.Singleton) {
				this.resolved[normId] = moduleResult;
			}
		}

		return moduleResult;

	}

	// TODO: Would probably be more useful to also print out dependencies in reverse order.
	// This way you could more easily see the most dependended-upon modules in the app.
	// TODO: We also don't account for external dependencies yet.
	printDependencies(id: string, prefix?: string): void {
		prefix = prefix || '';
		console.log(prefix + id);

		var mapping = this.mappings[normalizeId(id)];
		Utils.each(mapping.deps, function(dep) {
			this.printDependencies(dep, prefix + '--');
		}, this);
	}


	// Private methods

	private nodeJsGlobalResolver(id: string): any {
		return global[id];
	}

	private loadExternalFromRequire(id: string): any {
		if (!this.nodeModulesAt) {
			throw ('Before you can load external dependencies, you must specify where node_modules can be found by ' +
			      'setting the \'nodeModulesAt\' option when creating the context');
		}

		// First try to load it as a core module
		// Can't figure out a good way to detect whether a core module without trying it.
		// Might be able to find an array of core modules, but then it needs to be maintained.
		// At the very least, we should cache modules that *aren't* core, so we don't do this every time.
		try {
			return require(id);
		} catch (notACoreModule) {
			// Ignore. Not great.
		}
		var modulePath = path.join(this.nodeModulesAt, 'node_modules', id);
		if (!fs.existsSync(modulePath)) {
			// yes I know the docs don't like this method.
			// But it's a little better user experience than trying to require a file that isn't there.
			var msg = 'Could not find external dependency [' + id + '] at path [' + modulePath + ']';
			throw buildMissingDepMsg(msg, id, this.allExternalIds());
		}
		return require(modulePath);
	}

	private allExternalIds(): Array<string> {
		var modulePath = path.join(this.nodeModulesAt, 'node_modules');
		return fs.readdirSync(modulePath);
	}

	private verifyMappingProperties(mapping: any): void {
		Utils.each(mapping, function(_, key) {
			if (!Utils.contains(ContextImpl.validMappingProperties, key)) {
				throw buildMissingDepMsg('Invalid module export key: [' + key + ']', key, ContextImpl.validMappingProperties);
			}
		}, this);
	}

	private findSimilarMappings(id: string): Array<string> {
		var ids = Utils.each(this.mappings, function(mapping) {
			return mapping.id;
		}, this);
		return Utils.findSimilar(id, ids);
	}
}

class ResolverImpl implements Resolver {
		locals: Array<string>;
		externals: Array<string>;
		globals: Array<string>;
		mapping: any;
		resolvedDeps: any;

		exports: any;

		externalResolverFn: any;
		globalResolverFn: any;

		// TODO: Types for these arguments
		constructor(mapping: ResolvedModule, resolvedDeps: any, externalResolverFn: any, globalResolverFn: any) {
			this.mapping = mapping;
			this.resolvedDeps = resolvedDeps;
			this.locals = Utils.objectKeys(resolvedDeps);
			this.externals = mapping.externals;
			this.globals = mapping.globals;
			this.externalResolverFn = externalResolverFn;
			this.globalResolverFn = globalResolverFn;
		}

		// Try to load from locals, and fall back to externals or globals
		import<T>(id: string): T {
			var resolved = this.local<T>(id, true) ||
						   this.external<T>(id, true) ||
						   this.global<T>(id, true);

			if (resolved) {
				return resolved;
			} else {
				var allPossible = this.locals.concat(this.externals, this.globals);
				throw buildMissingDepMsg('Could not find import: [' + id + ']', id, allPossible);
			}
		}

		local<T>(id: string, noThrow?: boolean): T {
			var normId = normalizeId(id);
			if (!Utils.contains(this.locals, normId)) {
				if (noThrow) return undefined;
				var msg = 'Could not find import [' + id + '] from module [' + this.mapping.id + ']';
				throw buildMissingDepMsg(msg, id, this.locals);
			}
			return this.resolvedDeps[normId];
		}

		external<T>(id: string, noThrow?: boolean): T {
			if (!Utils.contains(this.externals, id)) {
				if (noThrow) return undefined;
				var msg = 'Could not find external dependency [' + id + '] from module [' + this.mapping.id + ']';
				throw buildMissingDepMsg(msg, id, this.externals);
			}
			return this.externalResolverFn(id);
		}

		global<T>(id: string, noThrow?: boolean): T {
			if (!Utils.contains(this.globals, id)) {
				if (noThrow) return undefined;
				var msg = 'Could not find global [' + id + '] from module [' + this.mapping.id + ']';
				throw buildMissingDepMsg(msg, id, this.globals);
			}
			return this.globalResolverFn(id);
		}
	}

	function buildMissingDepMsg(msg: string, id: string, possibleIds: Array<string>): string {
		var possible = Utils.findSimilar(id, possibleIds);
		if (possible.length > 0) {
			msg += '; maybe you meant: [' + possible.join(', ') + ']?';
		}
		return msg;
	}

	// IDs are not case-sensitive, but we need to make sure that resolved IDs are the same case
	function normalizeId(id: string): string {
		return id.toLowerCase();
	}

export = ContextImpl;
