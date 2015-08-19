'use strict';

module.exports = {
	each: each,
	findSimilar: findSimilar,
	parseFunctionArgs: parseFunctionArgs
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

function parseFunctionArgs(fn) {
	// Note: [\s\S] matches any character, including newline
  var fnRegex = /function(?:\s*)(?:\w*)\(([^)]*)\)/;

  var match = fnRegex.exec(fn.toString());
  if (!match) {
    throw 'Was not a function';
  }

  var args = match[1];
  if (args.length === 0) {
    return [];
  }

	// Pull out inline comments, if there are any
	var argRegex = /(?:\/\*([\s\S]+)\*\/)?(\w+)/;

  return args.split(',').map(function(s) {
			// Remove all whitespace
			return s.replace(/\s/g, '');
		}).map(function(s) {
			return argRegex.exec(s).slice(1);
		});
}
