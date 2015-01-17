
var glob = require('glob');
var levenshtein = require('levenshtein');
var fs = require('fs');

var fileFilters = {
	onlyIndexJs: function(fname) {
		return !strEndsWith(fname, '/index.js');
	},
	notIndexJs: function(fname) {
		return strEndsWith(fname, '/index.js');
	}
};

module.exports = {
	newContext: newContext, 
	singleModule: singleModule,
	fileFilters: fileFilters
};


function newContext(opts) {

	//// Configuration

	opts = opts || {};

	var externalRoot = opts.externalRoot;
	var idSeparator = opts.idSeparator || '.';

	var scopes = ['singleton', 'instance'];

	//// Local variables /////

	// Levenshtein distance between IDs when a missing dependency is found.
	// Any IDs within this distance will be suggested.
	var suggestionThreshold = 4;

	var mappings = {};
	var extMappings = {};
	var mainModule = undefined;

	// Contains modules already resolved (so we don't call init twice)
	var resolved = {}; 

	// Contains modules being resolved currently.
	// This allows us to detect circular dependencies.
	var resolving = [];

	// Default external resolver function
	var externalResolverFn = loadExternalFromRequire;
	

	//// Public API ////

	return {
		scanForFiles: scanForFiles,
		addMapping: addMapping,
		loadModule: loadModule,
		main: loadMainModule,
		fileFilters: fileFilters,
		getIdSeparator: getIdSeparator,
		printDependencies: printDependencies,
		getMainModuleId: getMainModuleId,

		// not-published api...
		setExternalResolverFn: setExternalResolverFn
	};

	//////////////////

	function setExternalResolverFn(resolver) {
		externalResolverFn = resolver;
	}

	function getIdSeparator() {
		return idSeparator;
	}

	function getMainModuleId() {
		return mainModule;
	}

	function scanForFiles(opts) {
		var baseDir;
		var idPrefix;
		var excludeFn;

		if (isString(opts)) {
			// Just assume the opts is the file path, all other options are default
			baseDir = opts;
			opts = {};
		} else {
			baseDir = opts.baseDir;
		}

		idPrefix = opts.idPrefix;
		excludeFn = opts.excludeFn || function(fname) { return false; };

		var baseDirLen = baseDir.length;

		var searchDir = baseDir + "/**/*.js";
		var filenames = glob.sync(searchDir);

		var included = [];
		each(filenames, function(name) {
			var d = name.substr(baseDirLen+1);
			if (!excludeFn(d)) {
				var m = require(name);
				addMapping(m, idPrefix, d);
				included.push(name);
			}
		});

		return included;
	}

	function addMapping(m, idPrefix, dir) {
		// _id overrides a built ID -- internal use only
		var id = m._id || buildModuleId(idPrefix, dir);

		var deps = m.imports || [];
		var init = m.init;
		var isMain = m.isMain;
		var scope = m.scope || 'singleton'
		var externals = m.extImports || [];

		if (!contains(scopes, scope)) {
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

		each(externals, function(extId) {
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
			throw buildMissingDepMsg(msg, id, findSimilarMappings(id));
		}

		var moduleResult;

		// Only resolve each module if we haven't already
		if (resolved[normId]) {
			moduleResult = resolved[normId];

		} else {

			// Detect circular dependencies --> see if were already trying to resolve this id
			if (contains(resolving, normId)) {
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
			each(m.deps, function(dep) {
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
		var possible = findSimilar(id, possibleIds, suggestionThreshold);
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
		if (strEndsWith(id, '.js')) {
			id = id.substr(0, id.length - '.js'.length);
		}
		if (idPrefix) {
			id = idPrefix + idSeparator + id;
		}
		return id;
	}

	function findSimilarMappings(id) {
		var ids = each(mappings, function(mapping) {
			return mapping.id;
		});
		return findSimilar(id, ids, suggestionThreshold);
	}

	function buildResolver(mapping, resolvedDeps) {
		var self = {
			// Try to load from locals, and fall back to externals
			import: function(depId) {
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
				if (!contains(mapping.externals, extId)) {
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
		each(mapping.deps, function(dep) {
			printDependencies(dep, prefix + '--');
		});
	}

};

function singleModule(fname, opts) {
	var ctx = newContext();
	opts = opts || {};
	var localImports = opts.imports || {};
	var extImports = opts.extImports || {};

	ctx.setExternalResolverFn(function(id) {
		// Specify an external resolver that 
		// TODO: Add suggestions if they're missing an import
		if (!extImports.hasOwnProperty(id)) {
			throw 'External dependency [' + id + '] was not satisfied for module: [' + fname + ']';
		}
		return extImports[id];
	});

	each(localImports, function(val, id) {			
		ctx.addMapping({
			_id: id,
			init: function() { return val; }
		});
	});

	var m = require(fname);
	var mapping = ctx.addMapping(m, undefined, fname);
	return ctx.loadModule(mapping.id);
}

function each(o, fn) { // map fn that works for both arrays and objects
	var r = [];
	for (var x in o) {
		if (o.hasOwnProperty(x)) {
			r.push(fn(o[x], x));
		}
	}
	return r;
}

function findSimilar(str, arr, threshold) {
	var ret = [];
	for (var i in arr) {
		var x = arr[i];
		var dist = lDist(str, x);
		if (dist < threshold) {
			ret.push(x);
		}
	}
	return ret;
}

function strEndsWith(str, val) {
	var slen = str.length;
	var vlen = val.length;
	var suffix = str.substr(slen-vlen, vlen);
	return (suffix == val);
}

function contains(arr, obj) {
	for (var i in arr) {
		if (arr[i] === obj) {
			return true;
		}
	}
	return false;
}

function isString(o) {
	return typeof o === 'string';
}

function lDist(str1, str2) {
	return new levenshtein(str1, str2).distance;
}
