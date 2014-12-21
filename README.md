# eggnog
eggnog is a simple, lightweight module framework for NodeJs. 

NPM: https://www.npmjs.com/package/eggnog

### What's wrong with require()?
Importing dependencies with require() has several issues:
  - Dependencies can be scattered across a file
  - Paths to local files are always relative, meaning require('../../utils/logger') is not uncommon
  - A clear dependency graph is not available, and circular dependencies can sneak in

### What does eggnog do?
  - Files are globally identifiable by their directory structure relative to the root. An ID might be 'utils.logger'.
  - Files list their dependency information at the top of every file. Another file in another part of the code might import 'utils.logger'
  - Most files only need to follow a convention to work with eggnog, and do not require any extra dependencies of their own
  - eggnog detects circular dependencies immediately
  - eggnog allows you to print dependency graphs to the console


### What do these declarations at the top of every file look like?
```
module.exports = {
  import: [
    {
      id: 'utils.logger', // Required module's ID
      as: 'log' // An alias used only in the imports object below
    }, 
    'services.myService' // If no alias is needed, just list the ID as a string
  ],
  init: init
};

function init(imports) {
  var log = imports.log;
  var myService = imports['services.myService'];
  ...
  return {
    // The return value from init() is what your module.exports 
    //   would have originally been
  };
}
```

In this way, if your logger utility is in {root}/utils/logger.js, then eggnog will automatically pick it up and make it available to all other files under the ID 'utils.logger'

### How do I start my app now?
  - eggnog is based around the creation of a context, which contains all the individual modules (files) to an application.
  - In your entry point (often server.js), you will create a new context, point it to your root directory, and then tell it to start your app.

```
var eggnog = require('eggnog');

var context = eggnog.newContext();
context.scanForFiles(__dirname);

context.main();
```

This will scan for all JS files in the current directory and subdirectories, and add them to the context. At this point, none of the init() methods in any files have been run, as they are only evaluated at the point they need to be.

The `context.main()` method will attempt to start the application from the module that declared itself the main module. There can only be one of these in the context at a time, and an error will be thrown if a second one is added. The main module can be declared as such:
```
module.exports = {
  isMain: true,
  import: [ ... ],
  init: init
};
...
```

Only after calling `context.main()` will the main module be loaded. This will load all of its dependencies first, and all of their dependencies, and so on until the app has been fully loaded. A module is considered loaded onces its init() method has been called once.

### Printing Dependency Tree
```
var context = ...
context.printDependencies('utils.logger');
// OR to print everything used by the app:
context.printDependencies(context.getMainModuleId());
```

### Examples
See https://github.com/MikeyBurkman/eggnog-exampleapp for example usage

### Misc Notes
  - The init() function on each module will be called at most only once. It will not be called at all if that module is not needed to run the app. (It's either not the starting module, or is not required by the starting module or any of its dependencies.)
  - Module IDs follow the directory structure, though are (by default) period-deliminated. So if file 'myapp/utils/logger' is loaded with 'myapp' as the root, then the ID becomes 'utils.logger'.
  - When listing dependencies, you may either list just a string (the ID), or a string and alias, as listed in the examples above. The alias is only used when accessing the dependency from the imports object passed to init().
  - IDs are case-insensitive, though the imports object passed to init() require the same casing as you specify in the dependencies. So you could import 'utils.Logger', that will work, but you would have to access it with imports['utils.Logger'].

##### Documentation TODO
  - Discuss other methods available on context
  - Discuss how to unit test by loading individual files
  - Using multiple eggnog contexts to build an application, which allows certain files to be essentially private to a module, and even allows for third-parties tools to be imported as eggnog contexts.
