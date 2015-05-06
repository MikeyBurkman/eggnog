var Utils = require('./Utils');
var ContextImpl = require("./ContextImpl");
var path = require('path');
var SingleModuleContext = (function () {
    function SingleModuleContext(rootDir) {
        this.rootDir = rootDir;
    }
    SingleModuleContext.prototype.buildModule = function (moduleId, opts) {
        opts = opts || {};
        var locals = opts.locals || {};
        var externals = opts.externals || {};
        var globals = opts.globals || {};
        var externalResolverFn = function (id) {
            if (!externals.hasOwnProperty(id)) {
                throw 'External dependency [' + id + '] was not satisfied for module: [' + moduleId + ']';
            }
            return externals[id];
        };
        var globalResolverFn = function (id) {
            if (!globals.hasOwnProperty(id)) {
                throw 'Global dependency [' + id + '] was not satisfied for module: [' + moduleId + ']';
            }
            return globals[id];
        };
        var ctx = new ContextImpl(undefined, externalResolverFn, globalResolverFn);
        Utils.each(locals, function (val, id) {
            ctx.addMapping({
                _id: id,
                init: function () { return val; }
            });
        });
        var fname = path.join(this.rootDir, Utils.directoryFromModuleId(moduleId) + '.js');
        var m = require(fname);
        m._id = moduleId;
        var mapping = ctx.addMapping(m, undefined, fname);
        return ctx.loadModule(mapping.id);
    };
    return SingleModuleContext;
})();
module.exports = SingleModuleContext;
