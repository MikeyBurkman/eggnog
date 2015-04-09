
import Levenshtein = require('levenshtein');

class Utils {
	static each(o: any, fn: (arg: any, i: any) => any): any[] { // map fn that works for both arrays and objects
		var r = [];
		for (var x in o) {
			if (o.hasOwnProperty(x)) {
				var val = fn(o[x], x);
				r.push(val);
			}
		}
		return r;
	}

	static moduleIdFromDirectory(directory: string, idPrefix?: string): string {
		var id = directory.replace(/\//g, '.');
		if (Utils.strEndsWith(id, '.js')) {
			id = id.substr(0, id.length - '.js'.length);
		}
		if (idPrefix) {
			id = [idPrefix, id].join('.');
		}
		return id;
	}

	static directoryFromModuleId(moduleId: string): string {
		return moduleId.replace(/\./g, '/');
	}

	static findSimilar(str: string, arr: Array<string>): Array<string> {
		var ret = [];
		var threshold = 4;
		for (var i in arr) {
			var x = arr[i];
			var dist = Utils.lDist(str, x);
			if (dist < threshold) {
				ret.push(x);
			}
		}
		return ret;
	}

	static strEndsWith(str: string, val: string): boolean {
		var slen = str.length;
		var vlen = val.length;
		var suffix = str.substr(slen-vlen, vlen);
		return (suffix == val);
	}

	static contains<T>(arr: Array<T>, obj: T): boolean {
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
	static mergeObjects(root: any, other: any): any {
		var res = {};
		Utils.each(root, function(value, key) {
			res[key] = value;
		});
		Utils.each(other, function(value, key) {
			res[key] = value;
		});
	}

	static isString(o: any): boolean {
		return typeof o === 'string';
	}

	static lDist(str1: string, str2: string): number {
		return new Levenshtein(str1, str2).distance;
	}

	static objectKeys(obj: any): Array<string> {
		return Utils.each(obj, function (value, key) { return key; });
	}

}

export = Utils;
