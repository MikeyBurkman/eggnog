'use strict';

module.exports = {
	each: each,
	findSimilar: findSimilar,
	strEndsWith: strEndsWith,
	mergeObjects: mergeObjects,
	lDist: lDist,
	getArgsForFunction: getArgsForFunction
};

var levenshtein = require('levenshtein');

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

// Return a new object which contains a merging of all properties in root and other.
// Properties in other take precedence.
// IE: mergeObjects({a: true, b: 42}, {a: false, c: 'abc'}) -> {a: false, b: 42, c: 'abc'}
function mergeObjects(root, other) {
	var res = {};
	each(root, function(value, key) {
		res[key] = value;
	});
	each(other, function(value, key) {
		res[key] = value;
	});
}

function lDist(str1, str2) {
	return new levenshtein(str1, str2).distance;
}

function getArgsForFunction(fn) {
	var fnRegex = /function (.+)?\((.*)\)/;
	var argRegex = /(\w+)(,\s)*/g;

	var match = fn.toString().match(fnRegex);
	if (!match) {
		throw 'Was not a function: ' + fn;
	}

	var args = match[2];
	var argsSplit = args.match(argRegex);
	return argsSplit || [];
}
