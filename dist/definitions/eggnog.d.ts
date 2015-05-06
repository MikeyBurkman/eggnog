import Context = require('./lib/Context');
import SingleModuleContext = require("./lib/SingleModuleContext");
declare class Eggnog {
    static createContext(nodeModulesAt?: string): Context;
    static createSingleModuleContext(rootDir: string): SingleModuleContext;
}
export = Eggnog;
