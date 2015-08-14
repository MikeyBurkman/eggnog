'use strict';

module.exports = scan;

var glob = require('glob');

function scan(directory) {

	var directoryLen = directory.length;

	var files = {};
	glob.sync(directory + '/**/*.js')
		.forEach(function(filename) {
			files[getModuleName(filename)] = require(filename);
		});

	function getModuleName(filename) {
		// Remove the directory from the name
		var name = filename.substr(directoryLen+1);
		// Remove .js from it as well
		return name.substr(0, name.length-('.js'.length));
	}

	return files;
}
