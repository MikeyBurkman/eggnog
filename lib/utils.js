module.exports = {
	each: each,
	moduleIdFromDirectory: moduleIdFromDirectory,
	directoryFromModuleId: directoryFromModuleId,
	findSimilar: findSimilar,
	strEndsWith: strEndsWith,
	contains: contains,
	mergeObjects: mergeObjects,
	isString: isString,
	lDist: lDist,
	objectKeys: objectKeys
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

function moduleIdFromDirectory(directory, idPrefix) {
	var id = directory.replace(/\//g, '.');
	if (strEndsWith(id, '.js')) {
		id = id.substr(0, id.length - '.js'.length);
	}
	if (idPrefix) {
		id = [idPrefix, id].join('.');
	}
	return id;
}

function directoryFromModuleId(moduleId) {
	return moduleId.replace(/\./g, '/');
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

function contains(arr, obj) {
	for (var i in arr) {
		if (arr[i] === obj) {
			return true;
		}
	}
	return false;
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

function isString(o) {
	return typeof o === 'string';
}

function lDist(str1, str2) {
	return new levenshtein(str1, str2).distance;
}

function objectKeys(obj) {
	return each(obj, function (value, key) { return key; });
}