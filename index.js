
var glob = require('glob');

module.exports = function() {

	//// Local variables /////

	var mappings = {};
	var mainModule = undefined;

	// Contains modules already resolved (so we don't call init twice)
	var resolved = {}; 

	//// Public API ////

	return {
		scanForFiles: scanForFiles,
		addMapping: addMapping,
		loadModule: loadModule,
		startApp: startApp
	};

	//////////////////

	function scanForFiles(baseDir, excludeFn) {
		excludeFn = excludeFn || function(fname) { return false; };

		var baseDirLen = baseDir.length;

		var searchDir = baseDir + "/**/*.js";
		var filenames = glob.sync(searchDir);

		filenames.map(function(name) {
			var d = name.substr(baseDirLen+1);
			if (!excludeFn(d)) {
				var m = require('./' + name);
				addMapping(m, d);
			}
		});
		
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
				return {
					id: d,
					as: d
				};
			} else {
				return d;
			}
		});

		mappings[normId] = {
			id: id,
			dir: dir,
			deps: deps,
			init: init
		};

		if (isMain) {
			if (mainModule) {
				throw 'Could not make [' + id + '] the main module; [' + mainModule + '] was already defined as the main module';
			}
			mainModule = id;
		}
	}

	function loadModule(id, parent) {
		var normId = normalizeId(id);
		var m = mappings[normId];

		if (!m) {
			var msg = 'Could not find dependency [' + id + ']'
			if (parent) {
				msg += ' in dependencies for [' + parent.id + ']';
			}
			throw msg;
		}

		if (!resolved[normId]) {
			// TODO Detect circular dependencies

			var deps = m.deps;
			var resolvedDeps = {};
			deps.map(function(dep) {
				var depId = dep.id;
				var depAlias = dep.as;
				resolvedDeps[depAlias] = loadModule(depId, m);
			});

			resolved[normId] = m.init(resolvedDeps);
		}

		return resolved[normId];
	}

	function startApp() {
		if (!mainModule) {
			throw 'No main module was found, cannot start the app';
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

	function strEndsWith(str, val) {
		var slen = str.length;
		var vlen = val.length;
		var suffix = str.substr(slen-vlen, vlen);
		return (suffix == val);
	}

	function isString(o) {
		return typeof o === 'string';
	}

};
