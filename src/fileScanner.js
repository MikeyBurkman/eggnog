'use strict';

module.exports = scan;

var glob = require('glob');

var utils = require('./utils.js');

function scan(opts) {
	var baseDir;
	var excludeFn;

	opts = opts || {};

	if (typeof(opts) === 'string') {
		// Just assume the opts is the file path, all other options are default
		opts = {
			baseDir: opts
		};
	}

	baseDir = opts.baseDir;

	excludeFn = opts.excludeFn || function(_) { return false; };

	var baseDirLen = baseDir.length;

	var searchDir = baseDir + '/**/*.js';
	var filenames = glob.sync(searchDir);

	var files = {};
	utils.each(filenames, function(name) {
		// Remove basedir from the name
		var d = name.substr(baseDirLen+1);
		// Remove .js from it as well
		d = d.substr(0, d.length-('.js'.length));

		if (!excludeFn(d)) {
			var m = require(name);
			if (m) {
				files[d] = m;
			}
		}
	});

	return files;
}
