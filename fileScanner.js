module.exports = scan;

var glob = require('glob');

var utils = require('./utils.js');

function scan(context, opts) {
	var baseDir;
	var idPrefix;
	var excludeFn;

	opts = opts || {};

	if (utils.isString(opts)) {
		// Just assume the opts is the file path, all other options are default
		baseDir = opts;
		opts = {};
	} else {
		baseDir = opts.baseDir;
	}

	idPrefix = opts.idPrefix;
	excludeFn = opts.excludeFn || function(fname) { return false; };

	var baseDirLen = baseDir.length;

	var searchDir = baseDir + "/**/*.js";
	var filenames = glob.sync(searchDir);

	var included = [];
	utils.each(filenames, function(name) {
		var d = name.substr(baseDirLen+1);
		if (!excludeFn(d)) {
			var m = require(name);
			if (m) {
				context.addMapping(m, idPrefix, d);
				included.push(name);
			}
		}
	});

	return included;
}