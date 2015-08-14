'use strict';

module.exports = TestContext;

var utils = require('./utils');
var path = require('path');

function TestContext(srcDirectory) {

  this.createModule = createModule;

  function createModule(moduleId, dependencies) {

    var dir = path.join(srcDirectory, moduleId);

    var loaded = require(dir);

    if (typeof(loaded) === 'function') {
      // These modules don't have any dependencies, so they're pretty boring
      return loaded();
    }

    var module = {
      init: loaded.init,
      requires: (loaded.requires || []).map(utils.normalizeModuleId)
    };

    // Verify that each thing in module.requires
    for (var reqIdx in module.requires) {
      var req = module.requires[reqIdx].unnormalized;
      if (!dependencies.hasOwnProperty(req)) {
        throw new Error('Cannot load module [' + moduleId + '] because of a missing dependency: [' + req + ']');
      }
    }

    var resolver = {
      require: function(id) {
        return dependencies[id];
      }
    };

    var initArgs = utils.resolveModuleInitArguments(module, resolver);

    return module.init.apply(resolver, initArgs);

  }

}
