'use strict';

module.exports = Context;

var utils = require('./utils.js');
var fileScanner = require('./fileScanner.js');

var fs = require('fs');
var path = require('path');

function Context(opts) {

	//// Configuration ////
	opts = opts || {};

	var srcDirectory = opts.srcDirectory;
	var nodeModulesAt = opts.nodeModulesAt;
	var resolverOverrides = opts.resolvers || {};

	//// Constants ////

	// List of properties allowed in module.exports.
	// These are not necessarily required. They are mostly to detect typos.
	var validMappingProperties = [
		'_id',
		'requires',
		'init',
		'scope',
		'isMain'
	];
	var scopes = ['singleton', 'instance'];

	//// Local variables ////

	var mappings = {};
	var mainModule = undefined;

	// Contains modules already resolved (so we don't call init twice)
	var resolved = {};

	// Contains modules being resolved currently.
	// This allows us to detect circular dependencies.
	var resolving = [];

	var resolvers = {
		'': localModuleResolverFn,
		'lib': nodeModulesResolverFn,
		'global': nodeJsGlobalResolverFn
	};

	//// Public API ////

	var moduleContext = this;
	this.loadModule = loadModule;
	this.main = loadMainModule;
	this.getMainModuleId = getMainModuleId;

	//////////////////

	//// Initialization ////

	// Add any resolver overrides
	utils.each(resolverOverrides, function(resolverFn, resolverPrefix) {
		if (resolverFn) {
			// New resolver
			resolvers[resolverPrefix] = resolverFn;
		} else {
			// Allow users to get rid of the old resolver
			delete resolvers[resolverPrefix];
		}
	});

	// Scan the given directory and add everything to our modules
	utils.each(fileScanner(srcDirectory), function(module, filename) {
		addMapping(module, filename);
	});

	//// Functions /////

	function getMainModuleId() {
		return mainModule;
	}

	function addMapping(m, filename) {

		var msg;

		// If the module is just a function, then we assume it's an init with no dependencies
		if (typeof(m) === 'function') {
			m = {
				init: m
			};
		}

		verifyMappingProperties(m);

		// _id overrides a built ID -- internal use only
		var id = m._id || filename;

		var requires = m.requires || [];
		var init = m.init;
		var isMain = m.isMain;
		var scope = m.scope || 'singleton';

		if (scopes.indexOf(scope) === -1) {
			msg = 'Unrecognized scope: [' + scope + '] for ID [' + id + ']';
			throwError(buildMissingDepMsg(msg, scope, scopes));
		}

		var normId = utils.normalizeModuleId(id);
		id = normId.unnormalized;

		if (mappings[id]) {
			msg = 'Error: Already had mapping for [' + id + ']';
			var otherFile = mappings[id].filename;
			if (otherFile) {
				msg += ' ; see [' + otherFile + ']';
			}
			throwError(msg);
		}

		// Verify that each required module has a correct (or no) prefix
		requires = requires.map(utils.normalizeModuleId);

		var validPrefixes = Object.keys(resolvers);
		utils.each(requires, function(requiresId) {
			if (validPrefixes.indexOf(requiresId.prefix) === -1) {
				msg = 'Unrecognized prefix for require: [' + requiresId.unnormalized + '] for ID [' + id + ']';
				throwError(buildMissingDepMsg(msg, requiresId.prefix, validPrefixes));
			}
		});

		mappings[id] = {
			id: normId,
			filename: filename,
			scope: scope,
			init: init,
			requires: requires
		};

		if (isMain) {
			if (mainModule) {
				throwError('Could not make [' + id + '] the main module; [' + mainModule + '] was already defined as the main module');
			}
			mainModule = id;
		}
	}

	function loadModule(id, parentId) {
		id = utils.normalizeModuleId(id);
		return resolvers[''](id, moduleContext, parentId);
	}

	function loadMainModule() {
		if (!mainModule) {
			throwError('No main module was found');
		}
		return loadModule(mainModule);
	}

	function allExternalIds() {
		var modulePath = path.join(nodeModulesAt, 'node_modules');
		return fs.readdirSync(modulePath);
	}

	function buildMissingDepMsg(msg, id, possibleIds) {
		var possible = utils.findSimilar(id, possibleIds);
		if (possible.length > 0) {
			msg += '; maybe you meant: [' + possible.join(', ') + ']?';
		}
		return msg;
	}


	function verifyMappingProperties(mapping) {
		utils.each(mapping, function(_, key) {
			if (validMappingProperties.indexOf(key) === -1) {
				throwError(buildMissingDepMsg('Invalid module export key: [' + key + ']', key, validMappingProperties));
			}
		});
	}

	function localModuleResolverFn(normalizedId, context, parentId) {
		var msg;

		var id = normalizedId.unnormalized;

		var m = mappings[id];

		if (!m) {
			msg = 'Could not find dependency [' + id + ']';
			if (parentId) {
				msg += ' in dependencies for [' + parentId.id + ']';
			}
			var mappingIds = utils.each(mappings, function(mapping) {
				return mapping.id.unnormalized;
			});

			throwError(buildMissingDepMsg(msg, id, mappingIds));
		}

		var moduleResult;

		// Only resolve each module if we haven't already
		if (resolved[id]) {
			moduleResult = resolved[id];

		} else {

			// Detect circular dependencies --> see if were already trying to resolve this id
			if (resolving.indexOf(id) >= 0) {
				resolving.push(id); // Add it to make the message better
				while (resolving[0] !== id) {
					// Remove any past dependencies, just to make the message simpler.
					// This will show exactly where the circular dependency is.
					// (Just remove it and look at the message to understand why it's here.)
					resolving.shift();
				}
				msg = 'Circular dependency detected! [' + resolving.join(' -> ') + ']';
				throwError(msg);
			}

			// Currently resolving this id
			resolving.push(id);

			var resolver = new Resolver(m);

			var initArgs = utils.resolveModuleInitArguments(m, resolver);

			moduleResult = m.init.apply(resolver, initArgs);
			if (moduleResult === undefined) {
				moduleResult = resolver.exports;
			}

			// This ID resolved, so pop the last item (normId) from the resolving stack
			resolving.pop();

			// Mark that we've resolved this module.
			// If a module is a singleton, we cache it so we don't re-resolve it next time
			if (m.scope === 'singleton') {
				resolved[id] = moduleResult;
			}
		}

		return moduleResult;
	}

	// Returns a variable that available in the list of globals
	function nodeJsGlobalResolverFn(normalizedId, context, parentId) {
		var globalId = normalizedId.id[0]; // TODO: Verify only one ID
		var x = global[globalId];
		if (!x) {
			var msg = 'Could not find global Node module [' + globalId + ']';
			if (parentId) {
				msg += ' from module + [' + parentId.unnormalized + ']';
			}
			throwError(buildMissingDepMsg(msg, globalId, Object.keys(global)));
		}
		return x;
	}

	// The equivalent of require() in normal node apps
	function nodeModulesResolverFn(normalizedId, context, parentId) {
		// TODO: Cache the results of these so we don't need to do existsSync() every time
		if (!nodeModulesAt) {
			throwError('Before you can load external dependencies, you must specify where node_modules can be found by ' +
				'setting the \'nodeModulesAt\' option when creating the context');
		}

		var extId = normalizedId.id[0]; // TODO: Validate that there's only one ID

		// First try to load it as a core module (available to all node apps regardless of project.json)
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
			var msg = 'Could not find external dependency [' + extId + '] at path [' + modulePath + '] from module + [' + parentId.unnormalized + ']';
			throwError(buildMissingDepMsg(msg, extId, allExternalIds()));
		}
		return require(modulePath);
	}

	function throwError(msg) {
		throw new Error(msg);
	}

	function Resolver(mapping) {
		this.require = function(id) {
			var normId = utils.normalizeModuleId(id);

			// Verify that id is in the requires
			var unnormalizedRequires = mapping.requires.map(function(r) {
				return r.unnormalized;
			});
			if (unnormalizedRequires.indexOf(normId.unnormalized) === -1) {
				// TODO: Suggestions
				var msg = 'Invalid/Unknown module for ID [' + id + '] in module [' + mapping.id.unnormalized + ']';
				throwError(buildMissingDepMsg(msg, normId.unnormalized, unnormalizedRequires));
			}

			return resolvers[normId.prefix](normId, moduleContext, mapping.id);

		};

		this.exports = undefined;
	}

}
