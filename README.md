## eggnog ##
What require() should be.

eggnog is a simple, lightweight dependency injection framework for NodeJs
- Designed for organizing applications that are structured into smaller modules
- Having the ability to unit test, without being opinionated on the framework, was a top priority 
- Minimal boilerplate -- Convention over configuration
- No config files or factories to define everything -- eggnog crawls your project for you
- No need to require any special dependencies in your files -- eggnog acts more like a spec than a library

[Link to NPM](https://www.npmjs.com/package/eggnog)

Current Version: 1.0.0

##### Here's what a typical NodeJs module might look like:
```js
module.exports = {
  requires: [
    'utils/config',
    'services/myService',
    'lib::express',
    'global::console'
  ],
  init: init
};

function init(config, myService, express, console) {
  // Real code here that uses the above injected 
  ...
  
  this.exports = {
    // Export for this module
  };
}
```

##### What about configuration?
```js
var Context = require('eggnog').Context;

var context = new Context({
  srcDirectory: __dirname + '/src', // Where your source is
  nodeModulesAt: __dirname // Where the node_modules directory is (for requiring external libraries)
});

context.main(); // Find the "main" module, load it, and run its init() function, returning its exports if there were any
```

That's it! eggnog will handle the rest of the configuration.

See the [wiki](https://github.com/MikeyBurkman/eggnog/wiki) for complete documentation.
