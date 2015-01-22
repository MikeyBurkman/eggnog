module.exports = {
	each: each,
	findSimilar: findSimilar,
	strEndsWith: strEndsWith,
	contains: contains,
	isString: isString,
	lDist: lDist
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