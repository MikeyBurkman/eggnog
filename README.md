# eggnog
### What require() should be.

See the [wiki](https://github.com/MikeyBurkman/eggnog/wiki) for complete documentation.

eggnog is a simple, lightweight dependency injection framework for NodeJs
- Designed for making modular applications easy to write
- Minimal boilerplate -- Convention over configuration
- No config files or factories to define anything -- eggnog crawls your project for you
- Dependency injection allow for easier testing
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
  // Only now anything we would have required is provided as arguments.
  // The inline comments direct eggnog what to provide for the arguments.
  
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
// This file is at the root of our project, alongside the node_modules directory

// All of our source files are ./src
var context = new require('eggnog').Context('src');

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
