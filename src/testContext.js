'use strict';

module.exports = TestContext;

var utils = require('./utils');
var path = require('path');

function TestContext(srcDirectory) {

  srcDirectory = path.join(process.cwd(), srcDirectory);
  this.createModule = createModule;

  function createModule(moduleId, dependencies) {

    var modulePath = path.join(srcDirectory, moduleId);

    try {
      var fn = require(modulePath);
    } catch (ex) {
      throw new Error('Could not load module at [' + modulePath + ']: ' + ex);
    }

		var args;
		try {
			args = utils.parseFunctionArgs(fn);
		} catch (ex) {
			throw new Error('Error trying to parse functions for module [' + modulePath + ']: ' + ex);
		}

    var initArgs = args.map(function(arg) {
      var argImport = arg[0];
      var argName = arg[1];

      if (!argImport) {
        throw new Error('Argument [' + argName + '] for ID [' + moduleId + '] was missing an inline comment indicating what module should be injected');
      }

      if (!dependencies.hasOwnProperty(argImport)) {
        throw new Error('Cannot load module [' + moduleId + '] because of a missing dependency: [' + argImport + ']');
      }

      return dependencies[argImport];
    });

    return fn.apply(undefined, initArgs);

  }

}
