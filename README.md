## eggnog ##
What Require() should be.

eggnog is a simple, lightweight module and dependency injection framework for NodeJs, especially made for medium-to-large projects that include many files.
- Minimal boilerplate
- No config files or factories to define everything -- eggnog crawls your project for you
- No need to require anything special in your files -- eggnog acts more like a spec than a dependency
- Intuitively unit test individual modules with virtually any testing framework

[Link to NPM](https://www.npmjs.com/package/eggnog)

Current Version: 1.0.0

### Since it's customary to start with sample code...
Here's what a typical NodeJs module might look like:
```js
module.exports = {
  requires: [
    'utils/logger',
    'services/myService',
    'lib::express',
    'lib::fs',
    'node::console'
  ],
  init: init
};

function init(logger, myService, express, fs, console) {
  ...
  this.exports = {
    // Export for this module
  };
}
```

### What's wrong with require()?
Importing dependencies with require() has several issues:
  - You are directly fetching the implementation, making unit testing much more difficult or even impossible.
  - Calls to require() can be scattered across a file, making it difficult to find which files depend on which
  - Paths to local files are always relative, meaning `require('../../utils/logger')` is not uncommon. These are ugly and difficult to maintain.
  - require() allows for circular dependencies, but this only works when returning partial exports, and it's [confusing and complicated](http://nodejs.org/api/modules.html#modules_cycles). There's no reason your architecture should ever require circular dependencies.

### What does eggnog do?
  - Crawls your source code and automatically discovers your files.
  - Provides a total replacement for require() in user code. (Also allows injecting, and thus mocking, of global variables as well.)
  - Provide a standard and lightweight convention to define modules and their depencies. This includes both local (relative) files, external (package.json or core node), and global dependencies
  - Uses require() behind the scenes, so packages and files are imported the way you expect them to be.
  - Injects dependencies, rather than having files fetch dependencies, making unit testing much easier.
  - Detects circular dependencies in your app.
  - Provides some basic scoping of modules.

### Why is that important?
  - Local files are always identified by their folder structure. A file at <app root>/foo/bar.js can be injected with the ID 'foo/bar'.
  - External files are identifiable with the same name you would use with require(). require('express') becomes 'lib::express'.
  - Requires dependency information to be listed at the top of every file, instead of being scattered. Consistency.
  - Most files only need to follow a convention to work with eggnog, and do not require any extra dependencies of their own. (In this way, you are locked in only to a convention, and not to the eggnog tool itself.)

### What type of projects can I use eggnog in?
  - eggnog is as un-opinionated as possible. (Except for a few things like not having circular dependencies and not tying modules to external implementations.)
  - Build any type of application you like with it, big or small, CLI or web app.
  - eggnog does not interfere with popular frameworks like Express.

### Here's our typical eggnog module looks like, but with some comments to help clarify things:
```js
// module.exports defines the metadata for your module: what it needs and how to initialize it
module.exports = {
  requires: [
    'utils/logger', // This is the file at <app root>/utils/logger.js
    'services/myService', // <app root>/services/myService.js
    'lib::express', // Anything prefixed with 'lib::' is a core or package.json dependency
    'lib::fs', // This is like require('fs')
    'node::console' // Anything with 'node::' are Node global variables, like console or process
  ],
  init: init
};

// By convention, we recommend having your init function separate.
// The argument names match the last part of the names of the required dependencies
function init(logger, myService, express, fs, console) {
  ...
  this.exports = {
    // This is what your module.exports would have originally been
  };
}
```

Note the complete lack of `require()` anywhere! You should no longer need to use require() in your code.

All dependencies listed in the imports in `module.exports` will available on the eggnog object passed to the init() function as arguments. The init() function will only be called once all the imports have been resolved.

In this example, your logger utility is assumed to be in <app root>/utils/logger.js, and so eggnog will automatically pick it up and make it available with the ID 'utils/logger'.

### How do I start my app now?
  - eggnog is based around the creation of a context, which contains all mappings of module IDs to the files.
  - In your entry point (often server.js), you will create a new context, point it to your root directory, and then tell it to start your app.

```js
// server.js or app.js
var Context = require('eggnog').Context;

var context = new Context({
  srcDirectory: __dirname + '/src', // All source files are expected to be in this folder
  nodeModulesAt: __dirname // This is required if your app has dependencies in package.json
});

context.main();
```

This will scan for all JS files in the current directory (`__dirname/src`) and subdirectories, and add them to the context. At this point, none of the init() methods in any files have been run, as they are only evaluated at the point they need to be.

The `context.main()` method will attempt to start the application from the module that declared itself the main module. There can only be one of these in the context at a time, and an error will be thrown if a second one is added. The main module can be declared as such:
```js
module.exports = {
  isMain: true,
  requires: [ ... ],
  init: init
};
...
```

Only after calling `context.main()` will the main module be loaded. This will load all of its dependencies first, and all of their dependencies, and so on, until the app has been fully loaded. A module is considered loaded onces its init() method has been called once.

If you don't have a main module, you can also load individual modules: `context.loadModule('foo/bar');`

### Scoping
Individual modules can have either `singleton` or `instance` scoping. 

##### Singleton
Singleton scoping is the default, and means that only one copy of the module exists for the entire application. More precisely, the init() function will only be called once per context. 

##### Instance
With instance scoping, the init() function will be run once for every module that depends upon it. Use this if you want a module to have state, but do not want it shared across the application. 

Notes:
  - It is guaranteed that one, and only one, instance of the instance-scoped module will be assigned to each module that imports it. Calling `this.require(id)` multiple times in the same module will always yield the same object.
  - Because require() caches files, NodeJs will only "load" each JS file once. It is the init() function that will be called multiple times.

In the below example, each module that imports this module will get its own counter. If the scope were singleton (or not provided), then all modules that import this one would share the same counter.
```js
module.exports = {
  scope: 'instance',
  init: init
};

function init() {
  var count = 0;
  this.exports = {
    increment: function() { return count++; }
  };
}
```

### Naming Conflicts?
  - If you have multiple dependencies with similar names that would cause naming conflicts as arguments to init(), you can use this.require('id') in the function instead.
```js
module.exports = {
  requires: [
    'utils/logger',
    'services/logger',
  ],
  init: init
};

function init() {
  var utilLogger = this.require('utils/logger');
  var servicesLogger = this.require('services/logger');
  ...
}
```

### Unit Testing

Because each module defines its dependencies, but not how to find them, it is possible to manually inject mock dependencies into a single module, and then run tests on that module. 

eggnog makes this easy and simple:

```js
var TestContext = require('eggnog').TestContext;

var context = new TestContext(__dirname + '/src');

// Assume the file we want to test is 'services.myService'
// Assume it has a dependency on 'node::console'
// The first argument is the ID for the module we're testing
// The second argument is an object containing implementations for each depedency
var service = context.createModule('services/myService', {
  'node::console': {
    log: function(msg) {
      ...
    }
  }
});
// service now has the mock console injected to it, and tests can be run against it
// You'd likely use a mock/spy for the dependencies and then run assertions on them
```

See the example app below for how to use eggnog with Mocha.

Notes: 
  - eggnog is not a unit test framework. It just allows you to easily inject mock dependencies. Use a real testing framework in conjunction with eggnog.
  - It is not possible (or at least not easy) to use a mix of real and mock implementations. This is on purpose. Using real implementations of dependencies would not make this a unit test.
  - Loading modules is cheap. (Remember, require() is used behind the scenes, which caches each file.) Create a new module for each individual test, to make sure each test is completely independent of each other.

### Linting
It's advised that you remove all NodeJs references from your lint config file, and only add the global `modules` variable, as that's really the only global variable your modules should be using. 

### Example Application
See [this example app](https://github.com/MikeyBurkman/eggnog-exampleapp)

### Misc Notes
  - The init() function will only be called if the module is either the starting module, or is a transitive dependency of the starting module. (A planned feature is to discover "dead" code that would never be called.)
  - IDs for dependencies are case-insensitive for local modules. If you have two files who only differ by their casing, then you should probably rename one of them, because that's just bad form.

### Why is it called eggnog?
  - I wrote this right before Christmas, so I was feeling festive.
  - Cutesy names are popular these days.
  - Like Google, it works nicely as a verb.
  - There was no other JS project in NPM in with this name.
