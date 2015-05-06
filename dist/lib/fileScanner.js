var Utils = require('./Utils');
var glob = require('glob');
var ScanResult = (function () {
    function ScanResult(fileName, directory, loadedModule) {
        this.fileName = fileName;
        this.directory = directory;
        this.loadedModule = loadedModule;
    }
    return ScanResult;
})();
exports.ScanResult = ScanResult;
function scan(args) {
    var baseDir = args.baseDir;
    var excludeFn = args.exclude || function (fname) { return false; };
    var baseDirLen = baseDir.length;
    var searchDir = baseDir + "/**/*.js";
    var filenames = glob.sync(searchDir);
    var results = [];
    Utils.each(filenames, function (name) {
        var d = name.substr(baseDirLen + 1);
        if (!excludeFn(d)) {
            var m = require(name);
            if (m) {
                results.push(new ScanResult(name, d, m));
            }
        }
    });
    return results;
}
exports.scan = scan;
