module.exports = {
	create: create
};

var fs = require('fs');

var utils = require('./utils.js');
var fileScanner = require('./fileScanner.js');

function create(opts) {

	//// Configuration ////

	opts = opts || {};

	var externalRoot = opts.externalRoot;

	// Default to external resolver function
	var externalResolverFn = opts.externalResolverFn || loadExternalFromRequire;

	//// Constants ////

	var scopes = ['singleton', 'instance'];
	var idSeparator = '.';

	// Levenshtein distance between IDs when a missing dependency is found.
	// Any IDs within this distance will be suggested.
	var suggestionThreshold = 4;

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
		scanForFiles: scanForFiles,
		addMapping: addMapping,
		loadModule: loadModule,
		main: loadMainModule,
		getIdSeparator: getIdSeparator,
		printDependencies: printDependencies,
		getMainModuleId: getMainModuleId
	};
	return self;

	//////////////////

	function getIdSeparator() {
		return idSeparator;
	}

	function getMainModuleId() {
		return mainModule;
	}

	function scanForFiles(opts) {
		return fileScanner(self, opts);
	}

	function addMapping(m, idPrefix, dir) {
		// _id overrides a built ID -- internal use only
		var id = m._id || buildModuleId(idPrefix, dir);

		var deps = m.imports || [];
		var init = m.init;
		var isMain = m.isMain;
		var scope = m.scope || 'singleton'
		var externals = m.extImports || [];

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

		utils.each(externals, function(extId) {
			if (!extMappings[extId]) {
				extMappings[extId] = externalResolverFn(extId);
			}
		});

		var mapping = mappings[normId] = {
			id: id,
			dir: dir,
			deps: deps,
			scope: scope,
			externals: externals,
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
			throw buildMissingDepMsg(msg, id, utils.findSimilarMappings(id));
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

			var resolver = buildResolver(m, resolvedDeps);

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
		var possible = utils.findSimilar(id, possibleIds, suggestionThreshold);
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
		if (!externalRoot) {
			throw 'You must specify a root directory for external files by setting the ' +
			      '\'externalRoot\' option in the context before you can load external dependencies';
		}

		// First try to load it as a core module
		// Can't figure out a good way to detect whether a core module without trying it
		try {
			return require(extId);
		} catch (notACoreModule) {
			// Ignore. Not great.
		}
		var path = externalRoot + '/node_modules/' + extId;
		if (!fs.existsSync(path)) {
			// yes I know the docs don't like this method. 
			// But it's a little better user experience than trying to require a file that isn't there.
			var msg = 'Could not find external dependency [' + extId + '] at path [' + path + ']';
			throw buildMissingDepMsg(msg, extId, allExternalIds());
		}
		return require(path);
	}

	function allExternalIds() {
		var path = externalRoot + '/node_modules';
		return _allExternalIdsCache = fs.readdirSync(path);
	}

	// IDs are not case-sensitive, but we need to make sure that resolved IDs are the same case
	function normalizeId(id) {
		return id.toLowerCase();
	}

	function buildModuleId(idPrefix, dir) {
		var id = dir.replace(/\//g, idSeparator);
		if (utils.strEndsWith(id, '.js')) {
			id = id.substr(0, id.length - '.js'.length);
		}
		if (idPrefix) {
			id = idPrefix + idSeparator + id;
		}
		return id;
	}

	function findSimilarMappings(id) {
		var ids = utils.each(mappings, function(mapping) {
			return mapping.id;
		});
		return utils.findSimilar(id, ids, suggestionThreshold);
	}

	function buildResolver(mapping, resolvedDeps) {
		var self = {
			// Try to load from locals, and fall back to externals
			import: function(depId) {
				// TODO: This could be optimized by not throwing and swallowing an exception each 
				// time they import an external dep
				try {
					return self.importLocal(depId);
				} catch (localEx) {
					// maybe it's an external dependency
					try {
						return self.importExt(depId);
					} catch (extEx) {
						// Could probably throw a better error here...
						throw [localEx, extEx];
					}
				}
			},
			importLocal: function(depId) {
				var normId = normalizeId(depId);
				if (!(resolvedDeps.hasOwnProperty(normId))) {
					var msg = 'Could not find import [' + depId + '] from module [' + mapping.id + ']';
					throw buildMissingDepMsg(msg, depId, findSimilarMappings(depId));
				}
				return resolvedDeps[normId];
			},
			importExt: function(extId) {
				if (!utils.contains(mapping.externals, extId)) {
					var msg = 'Could not find external dependency [' + extId + '] from module [' + mapping.id + ']';
					throw buildMissingDepMsg(msg, extId, mapping.externals);
				}
				return extMappings[extId];
			}
		};

		return self;
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

};