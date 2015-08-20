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
  /* utils/config */ config, 
  /* lib::express */ express, 
  /* global::console */ console) {
  
  // This is pretty much the Express.js Hello World app, verbatim.
  // The only difference is that we use arguments to the exported function 
  //  instead of using require().
  // The inline comments next to the arguments direct eggnog what to 
  //  provide for the arguments.
  
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

##### Our `src/utils/config.js` looks like this:
```js
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
// index.js
// This file needs to be at the root of our project, alongside the node_modules directory

var eggnog = require('eggnog');

// All of our source files are ./src
var context = new eggnog.Context('./src');

// context.loadModule('server/index') will find the "server/index" module in the 'src' directory, 
//  load it and any transitive dependencies, and then execute its function, automatically supplying 
//  its transitive dependencies as the arguments.
// It returns whatever the main module returned.
var app = context.loadModule('server/index');
```

##### Launching our application is nothing special:
```sh
node index.js
```

That's it! eggnog will handle the rest.
