'use strict';

module.exports = Context;

var utils = require('./utils.js');
var fileScanner = require('./fileScanner.js');

var fs = require('fs');
var path = require('path');

function Context(opts) {

	//// Configuration ////
	opts = opts || {};

	if (typeof(opts) === 'string') {
		// Assume this is the source directory, and use default node_modules dir
		opts = {
			srcDirectory: path.join(process.cwd(), opts),
			nodeModulesAt: process.cwd()
		};
	}

	var srcDirectory = opts.srcDirectory;
	var nodeModulesAt = path.join(opts.nodeModulesAt, 'node_modules');
	var resolverOverrides = opts.resolvers || {};

	//// Local variables ////

	var mappings = {};

	// Contains modules already resolved (so we don't call init twice)
	var resolved = {};

	// Contains modules being resolved currently.
	// This allows us to detect circular dependencies.
	var resolving = [];

	var resolvers = {
		'': localModuleResolverFn,
		'lib': nodeModulesResolverFn,
		'core': coreModulesResolverFn,
		'global': nodeJsGlobalResolverFn
	};

	// If this has a value for the external dependency module path, then that
	//	dependency exists. Used for error handling, mostly.
	var externalDepExists = {};

	//// Public API ////

	var moduleContext = this;
	this.loadModule = loadModule;

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
	var validModulePrefixes = Object.keys(resolvers);

	// Scan the given directory and add everything to our modules
	utils.each(fileScanner(srcDirectory), function(module, filename) {
		addMapping(module, filename);
	});

	//// Functions /////

	function addMapping(fn, filename) {

		var msg;

		var normId = normalizeModuleId(filename);
		var id = normId.unnormalized;

		if (mappings[id]) {
			msg = 'Error: Already had mapping for [' + id + ']';
			var otherFile = mappings[id].filename;
			if (otherFile) {
				msg += ' ; see [' + otherFile + ']';
			}
			throwError(msg);
		}

		var args;
		try {
			args = utils.parseFunctionArgs(fn);
		} catch (ex) {
			throw new Error('Error trying to parse functions for module [' + filename + ']: ' + ex);
		}

		// Verify that each required module has a correct (or no) prefix
		var requires = args.map(function(arg) {
			var argComment = arg[0];
			var argName = arg[1];

			if (!argComment) {
				throwError('Argument [' + argName + '] for ID [' + id + '] was missing an inline comment indicating what module should be injected');
			}

			var argImport = normalizeModuleId(argComment);

			if (validModulePrefixes.indexOf(argImport.prefix) === -1) {
				msg = 'Unrecognized prefix for require: [' + argImport.unnormalized + '] for ID [' + id + ']';
				throwError(buildMissingDepMsg(msg, argImport.prefix, validModulePrefixes));
			}

			return argImport;
		});

		mappings[normId.id] = {
			normId: normId,
			filename: filename,
			requires: requires,
			init: fn
		};
	}

	function loadModule(id, parentId) {
		id = normalizeModuleId(id);
		return resolvers[''](id, moduleContext, parentId);
	}

	function allExternalIds() {
		return fs.readdirSync(nodeModulesAt);
	}

	function buildMissingDepMsg(msg, id, possibleIds) {
		var possible = utils.findSimilar(id, possibleIds);
		if (possible.length > 0) {
			msg += '; maybe you meant: [' + possible.join(' OR ') + ']?';
		}
		return msg;
	}

	function normalizeModuleId(id) {
		var prefix, idVal, subIds;

		var idLower = id.toLowerCase();

		var split = idLower.split('::');
		if (split.length == 1) {
			prefix = '';
			idVal = split[0];
		} else if (split.length > 2) {
			throwError('Invalid ID: [' + id + ']: can only have :: occur once');
		} else {
			prefix = split[0];
			idVal = split[1];
		}

		// Given idVal = 'foo/bar.baz.dar'
		// idVal = 'foo/bar' and subIds = ['baz', 'dar']
		var idValSplit = idVal.split('.');
		idVal = idValSplit[0];
		subIds = idValSplit.slice(1);

		return {
			unnormalized: id,
			prefix: prefix,
			id: idVal,
			subIds: subIds
		};
	}

	function resolveSubIds(obj, normalizedId) {
		var res = obj;
		var subIds = normalizedId.subIds;

		var prevKey = undefined;
		subIds.forEach(function(subId) {
			if (res === undefined || res === null) {
				// Catch a potential null pointer
				var msg = 'Unable to resolve [' + subIds.join('.') + '] on module [' +
					normalizedId.id + ']: [' + prevKey + '] was null';
				throwError(msg);
			}

			res = res[subId];
			prevKey = subId;
		});
		return res;
	}

	function localModuleResolverFn(normalizedId) {
		var msg;

		var id = normalizedId.id;

		var m = mappings[id];
		if (!m) {
			msg = 'Could not find dependency [' + normalizedId.unnormalized + ']';
			var mappingIds = utils.each(mappings, function(mapping) {
				return mapping.normId.unnormalized;
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

			var initArgs = m.requires.map(function(moduleId) {
				return resolver.require(moduleId.unnormalized);
			});

			moduleResult = m.init.apply(undefined, initArgs);

			// This ID resolved, so pop the last item (normId) from the resolving stack
			resolving.pop();

			// Mark that we've resolved this module and store it in our cache
			resolved[id] = moduleResult;
		}

		return moduleResult;
	}

	// Returns a variable that available in the list of globals
	function nodeJsGlobalResolverFn(normalizedId) {
		var globalId = normalizedId.id;
		var x = global[globalId];
		if (!x) {
			var msg = 'Could not find global Node module [' + globalId + ']';
			throwError(buildMissingDepMsg(msg, globalId, Object.keys(global)));
		}
		return x;
	}

	// Requires core modules like path and fs
	function coreModulesResolverFn(normalizedId) {
		return require(normalizedId.id);
	}

	// Requires modules from the node_modules directory
	function nodeModulesResolverFn(normalizedId) {
		if (!nodeModulesAt) {
			throwError('Before you can load external dependencies, you must specify where node_modules can be found by ' +
				'setting the \'nodeModulesAt\' option when creating the context');
		}

		var extId = normalizedId.id;

		var modulePath = path.join(nodeModulesAt, extId);
		if (!externalDepExists[modulePath]) {
			// yes I know the docs don't like this method.
			// But it's a little better user experience than trying to require a file that isn't there.
			if (fs.existsSync(modulePath)) {
				externalDepExists[modulePath] = true; // cache it so we avoid the lookup next time

			} else {
				var msg = 'Could not find external dependency [' + extId + '] at path [' + modulePath + ']';
				throwError(buildMissingDepMsg(msg, extId, allExternalIds()));
			}

		}

		return require(modulePath);
	}

	function throwError(msg) {
		throw new Error(msg);
	}

	function Resolver(mapping) {
		this.require = function(id) {
			var normId = normalizeModuleId(id);

			// Verify that id is in the requires
			var unnormalizedRequires = mapping.requires.map(function(r) {
				return r.unnormalized;
			});
			if (unnormalizedRequires.indexOf(normId.unnormalized) === -1) {
				var msg = 'Invalid/Unknown module for ID [' + id + '] in module [' + mapping.normId.unnormalized + ']';
				throwError(buildMissingDepMsg(msg, normId.unnormalized, unnormalizedRequires));
			}

			try {
				var x = resolvers[normId.prefix](normId);
				return resolveSubIds(x, normId);
			} catch (ex) {
				throw new Error('Error loading module [' + id + '] from module [' + mapping.normId.unnormalized + ']: \n' + ex);
			}

		};
	}

}
