var ContextImpl = require('./ContextImpl');
var SingleModuleContext = require('./SingleModuleContext');
var Eggnog = (function () {
    function Eggnog() {
    }
    Eggnog.createContext = function (nodeModulesAt) {
        return new ContextImpl(nodeModulesAt);
    };
    Eggnog.createSingleModuleContext = function (rootDir) {
        return new SingleModuleContext(rootDir);
    };
    return Eggnog;
})();
module.exports = Eggnog;
