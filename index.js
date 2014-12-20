
module.exports = scan;

var glob = require('glob');
var q = require('q');

function scan(basedir) {

	var res = q.defer();

	var searchDir = basedir + "/**/index.js";
	glob(searchDir, function (er, filenames) {

		if (er) {
			res.reject(er);
			throw er;
		} else {
			try {
				var resolveModuleFn = buildMappings(filenames);
				res.resolve(resolveModuleFn);
			} catch (ex) {
				res.reject(ex);
			}
		}

	});

	return res.promise;

}

function buildMappings(filenames) {
	var mappings = {};

	filenames.map(function(name) {
		var m = require('./' + name);
		var id = m.id || name;
		var deps = m.deps || [];
		var init = m.init;

		if (mappings[id]) {
			var otherDir = mappings[id].dir;
			var msg = 'Error: Already had mapping for ' + id + ': [' + name + '] & [' + otherDir + ']';
			res.reject(msg);
			throw msg;
		}

		mappings[id] = {
			id: id,
			dir: name,
			deps: deps,
			init: init
		};

	});

	// TODO: Could look for dependencies and fail early here.
	// Otherwise we could only detect failures we get to a dependency we can't resolve.

	// Modules that have been resolved.
	var resolved = {}; 

	// Modules that are currently being resolved.
	// If we encounter one of these a second time, we have a circular dependency.
	var resolving = {};

	var resolveModule = function(id, parent) {
		var m = mappings[id];

		if (!m) {
			var msg = 'Could not find dependency [' + id + ']'
			if (parent) {
				msg += ' in dependencies for [' + parent.id + ']';
			}
			console.log(msg);
			throw msg;
		}

		if (!resolved[id]) {
			console.log('Resolving module: ', m.id);
			// TODO Detect circular dependencies

			var deps = m.deps;
			var resolvedDeps = {};
			deps.map(function(depId) {
				resolvedDeps[depId] = resolveModule(depId, m);
			});

			resolved[id] = m.init(resolvedDeps);
		}

		return resolved[id];

	};

	return resolveModule;
}

