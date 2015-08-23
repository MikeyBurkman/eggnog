# eggnog
### What require() should be.

See the [wiki](https://github.com/MikeyBurkman/eggnog/wiki) for complete documentation.

eggnog is a simple, lightweight dependency injection framework for NodeJs
- Designed for making modular applications easy to write
- Injection through function arguments
- Minimal boilerplate -- Convention over configuration
- No config files or factories to maintain -- eggnog crawls your project for you
- Dependency injection allow for easier testing
- No need to require any special dependencies in your files -- eggnog acts more like a spec than a library

[Link to NPM](https://www.npmjs.com/package/eggnog)

Current Version: 1.3.0

##### Let's assume this is file structure for our application:
```
index.js
package.json
node_modules/
  express/
    ...
src/
  server/
    index.js
  utils/
    config.js
```

##### Here's what our `src/server/index.js` module might look like:
```js
module.exports = function(
  /* utils/config.serverPort */ serverPort, 
  /* lib::express */ express, 
  /* global::console */ console,
  /* core::os */ os) {
  
  // This is pretty much the Express.js Hello World app, verbatim.
  // The only difference is that we use arguments to the exported function 
  //  instead of using require().
  // The inline comments next to the arguments direct eggnog what to 
  //  provide for the arguments.
  // (Also, I'm including os just to show how to load core modules.)
  
  var app = express();
  
  app.get('/', function (req, res) {
    res.send('Hello World!');
  });
  
  var server = app.listen(serverPort, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s on %s', host, port, os.type());
  });
  
  return app;
};
```

##### Our `src/utils/config.js` looks like this:
```js
// Note, this file doesn't have any dependencies, so no arguments 
//  to its export function
module.exports = function() {
  return {
    serverPort: 8080,
    foo: true,
    barUser: 'Mikey',
    ...
  };
};
```

##### Finally, `index.js` pulls everything together
```js
// Note! This file needs to be at the root of our project, alongside the 
//  node_modules and 'src' directories!

var eggnog = require('eggnog');

// All of our source files are ./src
var context = new eggnog.Context('./src');

// context.loadModule('server/index') will find the "server/index" module in the 
//  'src' directory, load it and any transitive dependencies, and then execute its 
//  function, automatically supplying its transitive dependencies as the arguments.
// It returns whatever the 'server/index' module returned after it loaded.
var app = context.loadModule('server/index');
```

##### Launching our application is nothing special:
```sh
node index.js
```

That's it! eggnog will handle the rest.

##### What about unit testing?
```js
var eggnog = require('eggnog');
var sinon = require('sinon');

var context = new eggnog.TestContext('/src');

var express = sinon.spy();
// Set up express spy
...

var app = context.createModule('server/index', {
  'utils/config.serverPort': 8080,
  'lib::express': express,
  'global::console': { log: function() {} }
});

// Assertions follow...
...

```
