import Context = require('./Context');
import SingleModuleContext = require('./SingleModuleContext');
declare class Eggnog {
    static createContext(nodeModulesAt?: string): Context;
    static createSingleModuleContext(rootDir: string): SingleModuleContext;
}
export = Eggnog;
