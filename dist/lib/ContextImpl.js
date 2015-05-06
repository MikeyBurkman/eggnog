var Utils = require('./Utils');
var fileScanner = require('./fileScanner');
var Scope = require('./Scope');
var EnumExt = require('./EnumExt');
var fs = require('fs');
var path = require('path');
var scopeNames = EnumExt.getNames(Scope);
var ContextImpl = (function () {
    function ContextImpl(nodeModulesAt, externalResolverFn, globalResolverFn) {
        this.mappings = {};
        this.extMappings = {};
        this.mainModule = undefined;
        this.resolved = {};
        this.resolving = [];
        var self = this;
        this.nodeModulesAt = nodeModulesAt;
        this.externalResolverFn = externalResolverFn || function () { return self.loadExternalFromRequire.apply(self, arguments); };
        this.globalResolverFn = globalResolverFn || this.nodeJsGlobalResolver;
    }
    ContextImpl.prototype.externalResolverFn = function (id) {
        return undefined;
    };
    ContextImpl.prototype.globalResolverFn = function (id) {
        return undefined;
    };
    ContextImpl.prototype.getMainModuleId = function () {
        return this.mainModule;
    };
    ContextImpl.prototype.main = function () {
        if (!this.mainModule) {
            throw 'No main module was found';
        }
        return this.loadModule(this.mainModule);
    };
    ContextImpl.prototype.addDirectory = function (baseDir) {
        var _this = this;
        var loaded = fileScanner.scan({
            baseDir: baseDir
        });
        var included = [];
        loaded.forEach(function (res) {
            included.push(res.fileName);
            _this.addMapping(res.loadedModule, undefined, res.directory);
        });
        return included;
    };
    ContextImpl.prototype.addMapping = function (eggnogModule, idPrefix, directory) {
        this.verifyMappingProperties(eggnogModule);
        var id = eggnogModule._id || Utils.moduleIdFromDirectory(directory, idPrefix);
        var deps = eggnogModule.locals || [];
        var init = eggnogModule.init;
        var isMain = eggnogModule.isMain;
        var scope = eggnogModule.scope || Scope.Singleton;
        var externals = eggnogModule.externals || [];
        var globals = eggnogModule.globals || [];
        var scopeName = EnumExt.getName(Scope, scope);
        if (!Utils.contains(scopeNames, scopeName)) {
            var msg = 'Unrecognized scope: [' + scope + '] for ID [' + id + ']';
            throw buildMissingDepMsg(msg, scopeName, scopeNames);
        }
        var normId = normalizeId(id);
        if (this.mappings[normId]) {
            var msg = 'Error: Already had mapping for [' + id + ']';
            var otherDir = this.mappings[normId].dir;
            if (otherDir) {
                msg += ' ; see [' + otherDir + ']';
            }
            throw msg;
        }
        var mapping = {
            id: id,
            dir: directory,
            deps: deps,
            scope: scope,
            externals: externals,
            globals: globals,
            init: init
        };
        this.mappings[normId] = mapping;
        if (isMain) {
            if (this.mainModule) {
                throw 'Could not make [' + id + '] the main module; [' + this.mainModule + '] was already defined as the main module';
            }
            this.mainModule = id;
        }
        return mapping;
    };
    ContextImpl.prototype.loadModule = function (id, parent) {
        var normId = normalizeId(id);
        var m = this.mappings[normId];
        if (!m) {
            var msg = 'Could not find dependency [' + id + ']';
            if (parent) {
                msg += ' in dependencies for [' + parent.id + ']';
            }
            throw buildMissingDepMsg(msg, id, this.findSimilarMappings(id));
        }
        var moduleResult;
        if (this.resolved[normId]) {
            moduleResult = this.resolved[normId];
        }
        else {
            if (Utils.contains(this.resolving, normId)) {
                this.resolving.push(normId);
                while (this.resolving[0] !== normId) {
                    this.resolving.shift();
                }
                var msg = 'Circular dependency detected! [' + this.resolving.join(' -> ') + ']';
                throw msg;
            }
            this.resolving.push(normId);
            var resolvedDeps = {};
            Utils.each(m.deps, function (dep) {
                dep = normalizeId(dep);
                resolvedDeps[dep] = this.loadModule(dep, m);
            }, this);
            var resolver = new ResolverImpl(m, resolvedDeps, this.externalResolverFn, this.globalResolverFn);
            moduleResult = m.init(resolver);
            if (moduleResult === undefined) {
                moduleResult = resolver.exports;
            }
            this.resolving.pop();
            if (m.scope === Scope.Singleton) {
                this.resolved[normId] = moduleResult;
            }
        }
        return moduleResult;
    };
    ContextImpl.prototype.printDependencies = function (id, prefix) {
        prefix = prefix || '';
        console.log(prefix + id);
        var mapping = this.mappings[normalizeId(id)];
        Utils.each(mapping.deps, function (dep) {
            this.printDependencies(dep, prefix + '--');
        }, this);
    };
    ContextImpl.prototype.nodeJsGlobalResolver = function (id) {
        return global[id];
    };
    ContextImpl.prototype.loadExternalFromRequire = function (id) {
        if (!this.nodeModulesAt) {
            throw ('Before you can load external dependencies, you must specify where node_modules can be found by ' +
                'setting the \'nodeModulesAt\' option when creating the context');
        }
        try {
            return require(id);
        }
        catch (notACoreModule) {
        }
        var modulePath = path.join(this.nodeModulesAt, 'node_modules', id);
        if (!fs.existsSync(modulePath)) {
            var msg = 'Could not find external dependency [' + id + '] at path [' + modulePath + ']';
            throw buildMissingDepMsg(msg, id, this.allExternalIds());
        }
        return require(modulePath);
    };
    ContextImpl.prototype.allExternalIds = function () {
        var modulePath = path.join(this.nodeModulesAt, 'node_modules');
        return fs.readdirSync(modulePath);
    };
    ContextImpl.prototype.verifyMappingProperties = function (mapping) {
        Utils.each(mapping, function (_, key) {
            if (!Utils.contains(ContextImpl.validMappingProperties, key)) {
                throw buildMissingDepMsg('Invalid module export key: [' + key + ']', key, ContextImpl.validMappingProperties);
            }
        }, this);
    };
    ContextImpl.prototype.findSimilarMappings = function (id) {
        var ids = Utils.each(this.mappings, function (mapping) {
            return mapping.id;
        }, this);
        return Utils.findSimilar(id, ids);
    };
    ContextImpl.validMappingProperties = [
        '_id',
        'locals',
        'externals',
        'globals',
        'init',
        'scope',
        'isMain'
    ];
    return ContextImpl;
})();
var ResolverImpl = (function () {
    function ResolverImpl(mapping, resolvedDeps, externalResolverFn, globalResolverFn) {
        this.mapping = mapping;
        this.resolvedDeps = resolvedDeps;
        this.locals = Utils.objectKeys(resolvedDeps);
        this.externals = mapping.externals;
        this.globals = mapping.globals;
        this.externalResolverFn = externalResolverFn;
        this.globalResolverFn = globalResolverFn;
    }
    ResolverImpl.prototype.import = function (id) {
        var resolved = this.local(id, true) ||
            this.external(id, true) ||
            this.global(id, true);
        if (resolved) {
            return resolved;
        }
        else {
            var allPossible = this.locals.concat(this.externals, this.globals);
            throw buildMissingDepMsg('Could not find import: [' + id + ']', id, allPossible);
        }
    };
    ResolverImpl.prototype.local = function (id, noThrow) {
        var normId = normalizeId(id);
        if (!Utils.contains(this.locals, normId)) {
            if (noThrow)
                return undefined;
            var msg = 'Could not find import [' + id + '] from module [' + this.mapping.id + ']';
            throw buildMissingDepMsg(msg, id, this.locals);
        }
        return this.resolvedDeps[normId];
    };
    ResolverImpl.prototype.external = function (id, noThrow) {
        if (!Utils.contains(this.externals, id)) {
            if (noThrow)
                return undefined;
            var msg = 'Could not find external dependency [' + id + '] from module [' + this.mapping.id + ']';
            throw buildMissingDepMsg(msg, id, this.externals);
        }
        return this.externalResolverFn(id);
    };
    ResolverImpl.prototype.global = function (id, noThrow) {
        if (!Utils.contains(this.globals, id)) {
            if (noThrow)
                return undefined;
            var msg = 'Could not find global [' + id + '] from module [' + this.mapping.id + ']';
            throw buildMissingDepMsg(msg, id, this.globals);
        }
        return this.globalResolverFn(id);
    };
    return ResolverImpl;
})();
function buildMissingDepMsg(msg, id, possibleIds) {
    var possible = Utils.findSimilar(id, possibleIds);
    if (possible.length > 0) {
        msg += '; maybe you meant: [' + possible.join(', ') + ']?';
    }
    return msg;
}
function normalizeId(id) {
    return id.toLowerCase();
}
module.exports = ContextImpl;
