
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


function newContext() {

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
		fileFilters: fileFilters
	};

	//////////////////

	function scanForFiles(baseDir, excludeFn) {
		excludeFn = excludeFn || function(fname) { return false; };

		var baseDirLen = baseDir.length;

		var searchDir = baseDir + "/**/*.js";
		var filenames = glob.sync(searchDir);

		var included = [];
		filenames.map(function(name) {
			var d = name.substr(baseDirLen+1);
			if (!excludeFn(d)) {
				var m = require('./' + name);
				addMapping(m, d);
				included.push(name;)
			}
		});
		
		return included;
	}

	function addMapping(m, dir) {
		var id = m.id || defaultId(dir);
		var deps = m.import || [];
		var init = m.init;
		var isMain = m.isMain;

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

		// Only resolve each module if we haven't already
		if (!resolved[normId]) {

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

			// Mark that we've resolved this module
			resolved[normId] = m.init(resolvedDeps);
		}

		return resolved[normId];
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

	function defaultId(dir) {
		var normalized = dir.replace(/\//g, '.');
		if (strEndsWith(normalized, '.js')) {
			normalized = normalized.substr(0, normalized.length - '.js'.length);
		}
		return normalized;
	}

	function findSimilarMappings(id) {
		var ret = [];
		for (x in mappings) {
			var mId = mappings[x].id;
			var dist = lDist(id, mId);
			if (dist < suggestionThreshold) {
				ret.push(mId);
			}
		};
		return ret;
	}

};

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