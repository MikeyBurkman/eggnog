var ContextImpl = require("./lib/ContextImpl");
var SingleModuleContext = require("./lib/SingleModuleContext");
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
