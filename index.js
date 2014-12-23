
var glob = require('glob');
var levenshtein = require('levenshtein');

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
	fileFilters: fileFilters
};


function newContext(opts) {

	//// Configuration

	opts = opts || {};

	var idSeparator = opts.idSeparator || '.';

	var scopes = ['singleton', 'instance'];

	//// Local variables /////

	// Levenshtein distance between IDs when a missing dependency is found.
	// Any IDs within this distance will be suggested.
	var suggestionThreshold = 5;

	var mappings = {};
	var mainModule = undefined;

	// Contains modules already resolved (so we don't call init twice)
	var resolved = {}; 

	// Contains modules being resolved currently.
	// This allows us to detect circular dependencies.
	var resolving = [];
	

	//// Public API ////

	return {
		scanForFiles: scanForFiles,
		addMapping: addMapping,
		loadModule: loadModule,
		main: loadMainModule,
		singleModule: singleModule,
		fileFilters: fileFilters,
		getIdSeparator: getIdSeparator,
		printDependencies: printDependencies,
		getMainModuleId: getMainModuleId
	};

	//////////////////

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
		filenames.map(function(name) {
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
		var id = buildModuleId(idPrefix, dir);
		var deps = m.import || [];
		var init = m.init;
		var isMain = m.isMain;
		var scope = m.scope || 'singleton'

		if (!contains(scopes, scope)) {
			var msg = 'Unrecognized scope: [' + scope + '] for ID [' + id + ']';
			var similar = findSimilar(scope, scopes, suggestionThreshold);
			if (similar.length > 0) {
				msg += '; did you mean? [' + similar.join(', ') + ']';
			}
			throw msg;
		}

		var normId = normalizeId(id);

		if (mappings[normId]) {
			var msg = 'Error: Already had mapping for [' + id + ']';
			var otherDir = mappings[normId].dir;
			if (otherDir) {
				msg += ' ; see [' + otherDir + ']'
			}
			throw msg;
		}

		deps = deps.map(function(d) {
			if (isString(d)) {
				// Can pass in a single string, in which case the alias and the id are both the string
				return {
					id: d,
					as: d
				};
			} else {
				return d;
			}
		});

		var mapping = mappings[normId] = {
			id: id,
			dir: dir,
			deps: deps,
			scope: scope,
			init: init
		};

		if (isMain) {
			if (mainModule) {
				throw 'Could not make [' + id + '] the main module; [' + mainModule + 
														'] was already defined as the main module';
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
			var possible = findSimilarMappings(id);
			if (possible.length > 0) {
				msg += '; maybe you meant [' + possible.join(', ') + ']?'
			}
			throw msg;
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

			var deps = m.deps;
			var resolvedDeps = {};
			deps.map(function(dep) {
				var depId = dep.id;
				var depAlias = dep.as;
				resolvedDeps[depAlias] = loadModule(depId, m);
			});

			// This ID resolved, so pop the last item (normId) from the resolving stack
			resolving.pop();

			moduleResult = m.init(resolvedDeps);

			// Mark that we've resolved this module.
			// If a module is a singleton, we cache it so we don't re-resolve it next time
			if (m.scope === 'singleton') {
				resolved[normId] = moduleResult;
			}
		}

		return moduleResult;
	}

	function singleModule(fname, imports) {
		imports = imports || {};
		for (var importId in imports) {
			var val = imports[importId];
			addMapping({
				id: importId,
				init: function() { return val; }
			});
		}
		var m = require(fname);
		var mapping = addMapping(m, fname);
		return loadModule(mapping.id);
	}

	function loadMainModule() {
		if (!mainModule) {
			throw 'No main module was found';
		}
		return loadModule(mainModule);
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
		var ids = [];
		for (x in mappings) {
			ids.push(mappings[x].id);
		};
		return findSimilar(id, ids, suggestionThreshold);
	}

	function printDependencies(id, prefix) {
		prefix = prefix || '';
		console.log(prefix + id);
		mappings[normalizeId(id)].deps.map(function(dep) {
			printDependencies(dep.id, prefix + '--');
		});
	}

};

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