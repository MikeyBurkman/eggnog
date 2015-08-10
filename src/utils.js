'use strict';

module.exports = {
	each: each,
	findSimilar: findSimilar,
	normalizeModuleId: normalizeModuleId,
	resolveModuleInitArguments: resolveModuleInitArguments
};

var levenshtein = require('fast-levenshtein');

function each(o, fn) { // map fn that works for both arrays and objects
	var r = [];
	for (var x in o) {
		if (o.hasOwnProperty(x)) {
			r.push(fn(o[x], x));
		}
	}
	return r;
}

function findSimilar(str, arr) {
	var ret = [];
	var threshold = 4;
	for (var i in arr) {
		var x = arr[i];
		var dist = levenshtein.get(str, x);
		if (dist < threshold) {
			ret.push(x);
		}
	}
	return ret;
}

function getArgsForFunction(fn) {
  var fnRegex = /function (.+)?\((.*)\)/;

  var match = fn.toString().match(fnRegex);
  if (!match) {
    throw 'Was not a function';
  }

  var args = match[2];
  if (args.length === 0) {
    return [];
  }

  return args.split(',').map(function(s) {
    return s.trim();
  });
}

function normalizeModuleId(id) {
	var prefix, idVal;

	id = id.toLowerCase();

	var split = id.split('::');
	if (split.length == 1) {
		prefix = '';
		idVal = id;
	} else if (split.length > 2) {
		throw 'Invalid ID: ' + id;
	} else {
		prefix = split[0];
		idVal = split[1];
	}

	return {
		unnormalized: id,
		prefix: prefix,
		id: idVal.split('/')
	};
}

function resolveModuleInitArguments(module, resolver) {
	var args = getArgsForFunction(module.init);
	return args.map(function(argName) {
		var matchId;
		var argNameLower = argName.toLowerCase(); // TODO: This should match normalizeId
		for (var depIdx in module.requires) {
			var dep = module.requires[depIdx];
			if (argNameLower === dep.id[dep.id.length-1]) {
				if (matchId) {
					throw new Error('Cannot use argument injection for argument [' + argName +
					'] because there are two dependencies that match: [' + matchId.unnormalized + '] and [' +
					dep.unnormalized + ']');
				}

				matchId = dep;
			}
		}

		if (!matchId) {
			// TODO: Suggestions
			throw new Error('Could not find dependency for argument: [' + argName + ']');
		}

		return resolver.require(matchId.unnormalized);
	});
}
