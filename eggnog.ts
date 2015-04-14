
import Context = require('./lib/Context');
import ContextImpl = require("./lib/ContextImpl");
import SingleModuleContext = require("./lib/SingleModuleContext");

class Eggnog {
	static createContext(nodeModulesAt?: string): Context {
		return new ContextImpl(nodeModulesAt);
	}
	static createSingleModuleContext(rootDir: string): SingleModuleContext {
			return new SingleModuleContext(rootDir);
	}
}

export = Eggnog;
