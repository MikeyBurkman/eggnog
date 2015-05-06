var Levenshtein = require('levenshtein');
var Utils = (function () {
    function Utils() {
    }
    Utils.each = function (o, fn, scope) {
        var r = new Array();
        for (var x in o) {
            if (o.hasOwnProperty(x)) {
                var val = fn.call(scope, o[x], x);
                r.push(val);
            }
        }
        return r;
    };
    Utils.moduleIdFromDirectory = function (directory, idPrefix) {
        var id = directory.replace(/\//g, '.');
        if (Utils.strEndsWith(id, '.js')) {
            id = id.substr(0, id.length - '.js'.length);
        }
        if (idPrefix) {
            id = [idPrefix, id].join('.');
        }
        return id;
    };
    Utils.directoryFromModuleId = function (moduleId) {
        return moduleId.replace(/\./g, '/');
    };
    Utils.findSimilar = function (str, arr) {
        var ret = new Array();
        var threshold = 4;
        for (var i in arr) {
            var x = arr[i];
            var dist = Utils.lDist(str, x);
            if (dist < threshold) {
                ret.push(x);
            }
        }
        return ret;
    };
    Utils.strEndsWith = function (str, val) {
        var slen = str.length;
        var vlen = val.length;
        var suffix = str.substr(slen - vlen, vlen);
        return (suffix == val);
    };
    Utils.contains = function (arr, obj) {
        for (var i in arr) {
            if (arr[i] === obj) {
                return true;
            }
        }
        return false;
    };
    Utils.mergeObjects = function (root, other) {
        var res = {};
        Utils.each(root, function (value, key) {
            res[key] = value;
        });
        Utils.each(other, function (value, key) {
            res[key] = value;
        });
        return res;
    };
    Utils.isString = function (o) {
        return typeof o === 'string';
    };
    Utils.lDist = function (str1, str2) {
        return new Levenshtein(str1, str2).distance;
    };
    Utils.objectKeys = function (obj) {
        return Utils.each(obj, function (value, key) { return key; });
    };
    return Utils;
})();
module.exports = Utils;
