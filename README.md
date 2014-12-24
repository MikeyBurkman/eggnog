## eggnog ##
eggnog is a simple, lightweight module and dependency injection framework for NodeJs. 

NPM: https://www.npmjs.com/package/eggnog

Current Version: 0.0.6

### What's wrong with require()?
Importing local dependencies (those within your application, not listed in package.json) with require() has several issues:
  - You are directly importing the implementation file, making unit testing much harder.
  - Calls to require() can be scattered across a file, making it difficult to find which files depend on which
  - Paths to local files are always relative, meaning require('../../utils/logger') is not uncommon. These are ugly and difficult to maintain.
  - A clear dependency graph is not available, and circular dependencies can sneak in unnoticed.

### What does eggnog do?
  - Provide a standard and lightweight convention to define modules and their depencies.
  - Injects dependencies, rather than having files fetch dependencies, making unit testing much simpler.
  - Files are globally identifiable by their directory structure relative to the root. An ID might be 'utils.logger'.
  - Files list their dependency information at the top of every file. Another file in another part of the app might import 'utils.logger'.
  - Most files only need to follow a convention to work with eggnog, and do not require any extra dependencies of their own. (In this way, you are not locked in to the eggnog tool for loading files.)
  - eggnog detects circular dependencies immediately
  - eggnog allows for some simple scoping of modules
  - eggnog allows you to print dependency graphs to the console

### What does eggnog NOT do?
  - Everything that isn't listed above.
  - It is as un-opinionated as possible.
  - Build any type of application you like with it, big or small, CLI or web app.
  - Does not interfere with popular frameworks like Express.

### What do these standard file conventions look like?
```js
module.exports = {
  import: [
    'utils.logger',
    'services.myService'
  ],
  init: init
};

function init(imports) {
  var log = imports['utils.logger'];
  var myService = imports['services.myService'];
  ...
  return {
    // The return value from init() is what your module.exports 
    //   would have originally been
  };
}
```

All dependencies listed in the import array will available on the imports object passed to the init() function. The init() function will only be called once all the imports have been resolved.

In this example, your logger utility is assumed to be in {root}/utils/logger.js, and so eggnog will automatically pick it up and make it available with the ID 'utils.logger'.

### How do I start my app now?
  - eggnog is based around the creation of a context, which contains all mappings of module IDs to the files.
  - In your entry point (often server.js), you will create a new context, point it to your root directory, and then tell it to start your app.

```js
var eggnog = require('eggnog');

var context = eggnog.newContext();
context.scanForFiles(__dirname);

context.main();
```

This will scan for all JS files in the current directory and subdirectories, and add them to the context. At this point, none of the init() methods in any files have been run, as they are only evaluated at the point they need to be.

Note: The base directory named passed to scanForFiles() will never be used in the IDs of the modules. Otherwise, Eggnog would have no way of knowing which folders should be part of the ID. (This may be change in the future.)

The `context.main()` method will attempt to start the application from the module that declared itself the main module. There can only be one of these in the context at a time, and an error will be thrown if a second one is added. The main module can be declared as such:
```js
module.exports = {
  isMain: true,
  import: [ ... ],
  init: init
};
...
```

Only after calling `context.main()` will the main module be loaded. This will load all of its dependencies first, and all of their dependencies, and so on until the app has been fully loaded. A module is considered loaded onces its init() method has been called once.

### Scoping
Individual modules can have either `singleton` or `instance` scoping. 

##### Singleton
Singleton scoping is the default, and means that only one copy of the module exists for the entire application. More precisely, the init() function will only be called once per context. 

##### Instance
With instance scoping, the init() function will be run once for every module that depends upon it. Use this if you want a module to have state, but do not want it shared across the application. Do note that NodeJs will only "load" each file once. It is the init() function that will be called multiple times.

In the below example, each module that imports this module will get its own counter. If the scope were singleton (or not provided), then all modules that import this one would share the same counter.
```js
module.exports = {
  scope: 'instance',
  init: init
};

function init(imports) {
  var count = 0;
  return {
    increment: function() { return count++; }
  };
}
```

### Printing Dependency Graph
The dependency graph can be printed to console.log for a particular module, or for the specified main module in the context:
```js
var context = ...
context.printDependencies('utils.logger');
// OR to print everything used by the app:
context.printDependencies(context.getMainModuleId());
```

### Examples
See https://github.com/MikeyBurkman/eggnog-exampleapp for example usage

### Misc Notes
  - The init() function will only be called if the module is either the starting module, or is a transitive dependency of the starting module.
  - Module IDs follow the directory structure, though are (by default) period-deliminated. So if file 'myapp/utils/logger' is loaded with 'myapp' as the root, then the ID becomes 'utils.logger'.
  - IDs are case-insensitive, though the imports object passed to init() require the same casing as you specify in the dependencies. So you could import 'utils.LOGger', that will work, but you would have to access it with imports['utils.LOGger'].

##### Documentation TODO
  - Discuss other methods available on context
  - How to unit test by loading individual files and mock dependencies in one call
  - How to use multiple eggnog contexts to build an application, which allows certain files to be essentially private to a module, and even allows for third-parties tools to be imported as eggnog contexts.
