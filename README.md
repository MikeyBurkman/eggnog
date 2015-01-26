## eggnog ##
What Require() should be.

eggnog is a simple, lightweight module and dependency injection framework for NodeJs. 

[Link to NPM](https://www.npmjs.com/package/eggnog)

Current Version: 0.3.1

eggnog is currently still in beta, and the API is still likely to change, though not much. If you use this and run into any questions/issues, feel free to create an issue on the Github page!

### Since it's customary to start with sample code...
Here's what your NodeJs modules might look like:
```js
// module.exports defines the metadata for your module: what it needs and how to initialize it
module.exports = {
  imports: [ // local dependencies (local JS files, not packages defined in package.json)
    'utils.logger',
    'services.myService'
  ],
  externals: [ // external (core or package.json) dependencies
    'express', // from node_modules
    'fs' // core module
  ]
  init: init
};

// By convention, we recommend having your init function separate.
// An eggnog object is passed to it, which provides a way to access the dependencies.
function init(eggnog) {
  var log = eggnog.import('utils.logger');
  var myService = eggnog.import('services.myService');
  var express = eggnog.import('express');
  var fs = eggnog.import('fs');
  ...
  eggnog.exports = {
    // This is what your module.exports would have originally been
  };
}
```

### What's wrong with require()?
Importing dependencies with require() has several issues:
  - You are directly fetching the implementation, making unit testing much more difficult or even impossible.
  - Calls to require() can be scattered across a file, making it difficult to find which files depend on which
  - Paths to local files are always relative, meaning `require('../../utils/logger')` is not uncommon. These are ugly and difficult to maintain.
  - require() allows for circular dependencies, but this only works when returning partial exports, and it's [confusing and complicated](http://nodejs.org/api/modules.html#modules_cycles). There's no reason your architecture should ever require circular dependencies.
  - A clear dependency graph is not available, and circular dependencies can sneak in unnoticed.

### What does eggnog do?
  - A replacement for require() in user code.
  - Provide a standard and lightweight convention to define modules and their depencies. This includes both local (relative) files, and external (package.json or core node) dependencies.
  - Uses require() behind the scenes, so packages and files are imported the way you expect them to be.
  - Injects dependencies, rather than having files fetch dependencies, making unit testing much easier.
  - Local files are globally identifiable by their directory structure relative to the root. An ID might be `'utils.logger'`.
  - External files are identifiable with the same name you would use with require().
  - Files list their dependency information at the top of every file. Another file in another part of the app might import `'utils.logger'`.
  - Most files only need to follow a convention to work with eggnog, and do not require any extra dependencies of their own. (In this way, you are locked in only to a convention, and not to the eggnog tool itself.)
  - eggnog detects circular dependencies immediately.
  - eggnog allows for some simple scoping of modules.
  - eggnog allows you to print dependency graphs to the console.

### What type of projects can I use eggnog in?
  - eggnog is as un-opinionated as possible. (Except for a few things like not having circular dependencies and not tying modules to external implementations.)
  - Build any type of application you like with it, big or small, CLI or web app.
  - eggnog does not interfere with popular frameworks like Express.

### Again, here's what a standard eggnog module looks like
```js
// module.exports defines the metadata for your module: what it needs and how to initialize it
module.exports = {
  imports: [ // local dependencies (local JS files, not packages defined in package.json)
    'utils.logger',
    'services.myService'
  ],
  externals: [ // external (core or package.json) dependencies
    'express', // from node_modules
    'fs' // core module
  ]
  init: init
};

// By convention, we recommend having your init function separate.
// An eggnog object is passed to it, which provides a way to access the dependencies.
function init(eggnog) {
  var log = eggnog.import('utils.logger');
  var myService = eggnog.import('services.myService');
  var express = eggnog.import('express');
  var fs = eggnog.import('fs');
  ...
  eggnog.exports = {
    // This is what your module.exports would have originally been
  };
}
```

Note the complete lack of `require()` anywhere! You should no longer need to use require() in your code.

All dependencies listed in the imports in `module.exports` will available on the eggnog object passed to the init() function via the `import(id)` function. The init() function will only be called once all the imports have been resolved.

In this example, your logger utility is assumed to be in {root}/utils/logger.js, and so eggnog will automatically pick it up and make it available with the ID 'utils.logger'.

### How do I start my app now?
  - eggnog is based around the creation of a context, which contains all mappings of module IDs to the files.
  - In your entry point (often server.js), you will create a new context, point it to your root directory, and then tell it to start your app.

```js
// server.js or app.js
var context = require('eggnog').newContext({
  externalRoot: __dirname // This is required if your app has dependencies in package.json
});
context.scanForFiles(__dirname);

context.main();
```

This will scan for all JS files in the current directory and subdirectories, and add them to the context. At this point, none of the init() methods in any files have been run, as they are only evaluated at the point they need to be.

Note: The base directory name passed to scanForFiles() will never be used in the IDs of the modules. Otherwise, Eggnog would have no way of knowing which folders should be part of the ID. (This may be change in the future.)

The `context.main()` method will attempt to start the application from the module that declared itself the main module. There can only be one of these in the context at a time, and an error will be thrown if a second one is added. The main module can be declared as such:
```js
module.exports = {
  isMain: true,
  imports: [ ... ],
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
With instance scoping, the init() function will be run once for every module that depends upon it. Use this if you want a module to have state, but do not want it shared across the application. 

Notes:
  - It is guaranteed that one, and only one, instance of the instance-scoped module will be assigned to each module that imports it. Calling `eggnog.import(id)` multiple times in the same module will always yield the same object.
  - Because require() caches files, NodeJs will only "load" each JS file once. It is the init() function that will be called multiple times.

In the below example, each module that imports this module will get its own counter. If the scope were singleton (or not provided), then all modules that import this one would share the same counter.
```js
module.exports = {
  scope: 'instance',
  init: init
};

function init(eggnog) {
  var count = 0;
  eggnog.exports = {
    increment: function() { return count++; }
  };
}
```

### Naming Conflicts?
  - In the case of local and external dependencies having the same ID, `eggnog.import(id)` will always favor local dependencies. 
  - You can work around this by explicitly calling `eggnog.importLocal(id)` or `eggnog.importExt(id)`.
```js
function init(eggnog) {
  // The one in the root directory of your app's source code
  var localLogger = eggnog.importLocal('logger'); 
  
  // The one you define in project.json
  var externalLogger = eggnog.importExt('logger');
  
  ...
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

### Unit Testing

Because each module defines its dependencies, but not how to find them, it is possible to manually inject mock dependencies into a single module, and then run tests on that module. eggnog makes this easy and simple:

```js
var eggnog = require('eggnog');

// Assume the file we want to test is at ./myApp/service.js
// Assume it has a dependency on myApp.userDao and fs
var filename = __dirname + '/myApp/service.js';
var service = eggnog.singleModule(filename, {
  imports: {
    // When the service imports 'myApp.userDao', this object will be injected
    'myApp.userDao': {
      getUser: function(userId) {
      return { /* mock user object */ };
    },
    // other methods that service.js uses from userDao from the test...
  },
  extImports: {
    // When the service imports 'fs', this object will be injected
    'fs': {
      readdirSync: function(path) {
        // this is the method that will be called when the service calls fs.readdirSync()
        return ['testDirectory'];
      }
    }
  }
});
// service now has the mocks injected to it, and tests can be run against it
```

Notes: 
  - eggnog is not a unit test framework. It just allows you to easily inject mock dependencies. Use a real testing framework in conjunction with eggnog.
  - It is not possible (or at least not easy) to use a mix of real and mock implementations. This is on purpose. Using real implementations of dependencies would not make this a unit test.
  - Loading modules is cheap. (Remember, require() is used behind the scenes, which caches each file.) Create a new context for each individual test, to make sure each test is completely independent of each other.

### Examples
See [this example app](https://github.com/MikeyBurkman/eggnog-exampleapp)

### Misc Notes
  - The init() function will only be called if the module is either the starting module, or is a transitive dependency of the starting module.
  - Local module IDs follow the directory structure, though are (by default) period-deliminated. So if file `'/home/joe/myapp/utils/logger'` is loaded with `'/home/joe/myapp'` as the root, then the module ID becomes `'utils.logger'`.
  - IDs are case-insensitive for local modules. If you have two files who only differ by their casing, then you should probably rename one of them, because that's just bad form. (External files generally follow the naming rules for require())

##### Documentation TODO
  - Other methods available on the context.
  - File filters when loading modules.
  - Loading multiple folders into a context by specifying a prefix.
