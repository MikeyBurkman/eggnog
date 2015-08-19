# eggnog
### What require() should be.

See the [wiki](https://github.com/MikeyBurkman/eggnog/wiki) for complete documentation.

eggnog is a simple, lightweight dependency injection framework for NodeJs
- Designed for organizing applications that are structured into smaller modules
- Having the ability to unit test, without being opinionated on the framework, was a top priority 
- Minimal boilerplate -- Convention over configuration
- No config files or factories to define anything -- eggnog crawls your project for you
- No need to require any special dependencies in your files -- eggnog acts more like a spec than a library

[Link to NPM](https://www.npmjs.com/package/eggnog)

Current Version: 1.1.0

##### Here's what a typical NodeJs module might look like:
```js
// src/server/index.js
module.exports = function(
  /* utils/config */ config, 
  /* lib::express */ express, 
  /* global::console */ console) {
  // Pretty much the Express.js Hello World app, verbatim
  
  var app = express();
  
  app.get('/', function (req, res) {
    res.send('Hello World!');
  });
  
  var server = app.listen(config.serverPort, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
  });
  
  return app;
};
```

##### Our static config file that could be shared by multiple modules:
```js
// src/utils/config.js
module.exports = function() {
  return {
    serverPort: 8080,
    foo: true,
    barUser: 'Mikey',
    ...
  };
};
```

##### What about configuring eggnog to make the app run?
```js
// index.js
// This file is at the root of our project, alongside node_modules
var Context = require('eggnog').Context;

var context = new Context('src'); // Point eggnog at our source directory

// context.loadModule('server/index') will find the "server/index" module in the 'src' directory, 
//  load it and any transitive dependencies, and then execute its function, automatically supplying 
//  its transitive dependencies as the arguments.
// It returns whatever the main module returned.
var app = context.loadModule('server/index');
```

##### And launching our application is nothing special
```sh
node index.js
```

That's it! eggnog will handle the rest.
