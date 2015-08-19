'use strict';

module.exports = TestContext;

var utils = require('./utils');
var path = require('path');

function TestContext(srcDirectory) {

  srcDirectory = path.join(process.cwd(), srcDirectory);
  this.createModule = createModule;

  function createModule(moduleId, dependencies) {

    var modulePath = path.join(srcDirectory, moduleId);

    var fn = require(modulePath);

		var args;
		try {
			args = utils.parseFunctionArgs(fn);
		} catch (ex) {
			throw new Error('Error trying to parse functions for module [' + modulePath + ']: ' + ex);
		}

    var initArgs = args.map(function(arg) {
      var argImport = arg[0];
      var argName = arg[1];
      if (!dependencies.hasOwnProperty(argImport)) {
        throw new Error('Cannot load module [' + modulePath + '] because of a missing dependency: [' + argImport + ']');
      }

      return dependencies[argImport];
    });

    var resolver = {
      require: function(id) {
        return dependencies[id];
      }
    };

    return fn.apply(undefined, initArgs);

  }

}
