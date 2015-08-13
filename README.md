# eggnog
### What require() should be.

See the [wiki](https://github.com/MikeyBurkman/eggnog/wiki) for complete documentation.

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
// server/index.js
module.exports = {
  requires: [
    'utils/config', // Local module, defined below
    'lib::express', // ExpressJs
    'global::console' // Node's built-in console
  ],
  isMain: true, // Indicates this is the main module for our app
  init: init
};

function init(config, express, console) {
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
}
```

##### Our static config file that could be shared by multiple modules
```js
// utils/config.js
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
// Probably index.js, at the root of our project
var Context = require('eggnog').Context;

var context = new Context({
  srcDirectory: __dirname + '/src', // Where your source is
  nodeModulesAt: __dirname // Where the node_modules directory is (for requiring external libraries)
});

// context.main() will find the "main" module, load it and any transitive dependencies, and execute its init() function
// It then returns whatever the main module returned, if anything
var app = context.main();
```

##### And launching our app is nothing special
```sh
node index.js
```

That's it! eggnog will handle the rest.
