module.exports = {
	create: create
};

var utils = require('./utils.js');
var fileScanner = require('./fileScanner.js');

var fs = require('fs');
var path = require('path');

function create(opts) {

	//// Configuration ////

	opts = opts || {};

	var nodeModulesAt = opts.nodeModulesAt;

	// Default to external resolver function
	var externalResolverFn = opts.externalResolverFn || loadExternalFromRequire;

	// Default to global resolver that loads from node's globals object
	var globalResolverFn = opts.globalResolverFn || nodeJsGlobalResolver;

	//// Constants ////

	// List of properties allowed in module.exports.
	// These are not necessarily required. They are mostly to detect typos.
	var validMappingProperties = [
		'_id',
		'imports',
		'extImports',
		'globals',
		'init',
		'scope',
		'isMain'
	];
	var scopes = ['singleton', 'instance'];

	//// Local variables ////

	var mappings = {};
	var extMappings = {};
	var mainModule = undefined;

	// Contains modules already resolved (so we don't call init twice)
	var resolved = {}; 

	// Contains modules being resolved currently.
	// This allows us to detect circular dependencies.
	var resolving = [];

	//// Public API ////

	var self = {
		addDirectory: addDirectory,
		addMapping: addMapping,
		loadModule: loadModule,
		main: loadMainModule,
		printDependencies: printDependencies,
		getMainModuleId: getMainModuleId
	};
	return self;

	//////////////////

	function getMainModuleId() {
		return mainModule;
	}

	function addDirectory(opts) {
		return fileScanner(self, opts);
	}

	function addMapping(m, idPrefix, dir) {

		verifyMappingProperties(m);

		// _id overrides a built ID -- internal use only
		var id = m._id || utils.moduleIdFromDirectory(dir, idPrefix);

		var deps = m.imports || [];
		var init = m.init;
		var isMain = m.isMain;
		var scope = m.scope || 'singleton'
		var externals = m.extImports || [];
		var globals = m.globals || [];

		if (!utils.contains(scopes, scope)) {
			var msg = 'Unrecognized scope: [' + scope + '] for ID [' + id + ']';
			throw buildMissingDepMsg(msg, scop, scopes);		}

		var normId = normalizeId(id);

		if (mappings[normId]) {
			var msg = 'Error: Already had mapping for [' + id + ']';
			var otherDir = mappings[normId].dir;
			if (otherDir) {
				msg += ' ; see [' + otherDir + ']'
			}
			throw msg;
		}

		var mapping = mappings[normId] = {
			id: id,
			dir: dir,
			deps: deps,
			scope: scope,
			externals: externals,
			globals: globals,
			init: init
		};

		if (isMain) {
			if (mainModule) {
				throw 'Could not make [' + id + '] the main module; [' + mainModule + '] was already defined as the main module';
			}
			mainModule = id;
		}

		return mapping;
	}

	function loadModule(id, parent) {
		var normId = normalizeId(id);
		var m = mappings[normId];

		if (!m) {
			var msg = 'Could not find dependency [' + id + ']'
			if (parent) {
				msg += ' in dependencies for [' + parent.id + ']';
			}
			throw buildMissingDepMsg(msg, id, findSimilarMappings(id));
		}

		var moduleResult;

		// Only resolve each module if we haven't already
		if (resolved[normId]) {
			moduleResult = resolved[normId];

		} else {

			// Detect circular dependencies --> see if were already trying to resolve this id
			if (utils.contains(resolving, normId)) {
				resolving.push(normId); // Add it to make the message better
				while (resolving[0] !== normId) {
					// Remove any past dependencies, just to make the message simpler.
					// This will show exactly where the circular dependency is.
					// (Just remove it and look at the message to understand why it's here.)
					resolving.shift();
				}
				var msg = 'Circular dependency detected! [' + resolving.join(' -> ') + ']';
				throw msg;
			}

			// Currently resolving this id
			resolving.push(normId);

			var resolvedDeps = {};
			utils.each(m.deps, function(dep) {
				dep = normalizeId(dep);
				resolvedDeps[dep] = loadModule(dep, m);
			});

			var resolver = new Resolver(m, resolvedDeps);

			moduleResult = m.init(resolver);
			if (moduleResult === undefined) {
				moduleResult = resolver.exports;
			}

			// This ID resolved, so pop the last item (normId) from the resolving stack
			resolving.pop();

			// Mark that we've resolved this module.
			// If a module is a singleton, we cache it so we don't re-resolve it next time
			if (m.scope === 'singleton') {
				resolved[normId] = moduleResult;
			}
		}

		return moduleResult;
	}

	function buildMissingDepMsg(msg, id, possibleIds) {
		var possible = utils.findSimilar(id, possibleIds);
		if (possible.length > 0) {
			msg += '; maybe you meant: [' + possible.join(', ') + ']?';
		}
		return msg;
	}

	function loadMainModule() {
		if (!mainModule) {
			throw 'No main module was found';
		}
		return loadModule(mainModule);
	}

	function loadExternalFromRequire(extId) {
		if (!nodeModulesAt) {
			throw 'Before you can load external dependencies, you must specify where node_modules can be found by ' +
			      'setting the \'nodeModulesAt\' option when creating the context';
		}

		// First try to load it as a core module
		// Can't figure out a good way to detect whether a core module without trying it
		try {
			return require(extId);
		} catch (notACoreModule) {
			// Ignore. Not great.
		}
		var modulePath = path.join(nodeModulesAt, 'node_modules', extId);
		if (!fs.existsSync(modulePath)) {
			// yes I know the docs don't like this method. 
			// But it's a little better user experience than trying to require a file that isn't there.
			var msg = 'Could not find external dependency [' + extId + '] at path [' + modulePath + ']';
			throw buildMissingDepMsg(msg, extId, allExternalIds());
		}
		return require(modulePath);
	}

	function allExternalIds() {
		var modulePath = path.join(nodeModulesAt, 'node_modules');
		return _allExternalIdsCache = fs.readdirSync(modulePath);
	}

	// IDs are not case-sensitive, but we need to make sure that resolved IDs are the same case
	function normalizeId(id) {
		return id.toLowerCase();
	}

	function findSimilarMappings(id) {
		var ids = utils.each(mappings, function(mapping) {
			return mapping.id;
		});
		return utils.findSimilar(id, ids);
	}

	// TODO: Would probably be more useful to also print out dependencies in reverse order.
	// This way you could more easily see the most dependended-upon modules in the app.
	// TODO: We also don't account for external dependencies yet.
	function printDependencies(id, prefix) {
		prefix = prefix || '';
		console.log(prefix + id);

		var mapping = mappings[normalizeId(id)];
		utils.each(mapping.deps, function(dep) {
			printDependencies(dep, prefix + '--');
		});
	}

	function verifyMappingProperties(mapping) {
		utils.each(mapping, function(_, key) {
			if (!utils.contains(validMappingProperties, key)) {
				throw buildMissingDepMsg('Invalid module export key: [' + key + ']', key, validMappingProperties);
			}
		});
	}

	function nodeJsGlobalResolver(globalId) {
		return global[globalId];
	}

	function Resolver(mapping, resolvedDeps) {
		var locals = utils.objectKeys(resolvedDeps);
		var externals = mapping.externals;
		var globals = mapping.globals;
		
		// Try to load from locals, and fall back to externals or globals
		this.import = function(depId) {
			var resolved = this.local(depId, true) || 
						   this.external(depId, true) || 
						   this.global(depId, true);
						   
			if (resolved) {
				return resolved;
			} else {
				var allPossible = locals.concat(externals, globals);
				throw buildMissingDepMsg('Could not find import: [' + depId + ']', depId, allPossible);
			}
		};

		this.local = function(depId, noThrow) {
			var normId = normalizeId(depId);
			if (!utils.contains(locals, normId)) {
				if (noThrow) return undefined;
				var msg = 'Could not find import [' + depId + '] from module [' + mapping.id + ']';
				throw buildMissingDepMsg(msg, depId, locals);
			}
			return resolvedDeps[normId];
		};

		this.external = function(depId, noThrow) {
			if (!utils.contains(externals, depId)) {
				if (noThrow) return undefined;
				var msg = 'Could not find external dependency [' + depId + '] from module [' + mapping.id + ']';
				throw buildMissingDepMsg(msg, depId, externals);
			}
			return externalResolverFn(depId);
		};

		this.global = function(depId, noThrow) {
			if (!utils.contains(globals, depId)) {
				if (noThrow) return undefined;
				var msg = 'Could not find global [' + depId + '] from module [' + mapping.id + ']';
				throw buildMissingDepMsg(msg, depId, globals);
			}
			return globalResolverFn(depId);
		};
	}

};