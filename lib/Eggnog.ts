
import Context = require('./Context');
import ContextImpl = require('./ContextImpl');
import SingleModuleContext = require('./SingleModuleContext');

class Eggnog {
	static createContext(nodeModulesAt?: string): Context {
		return new ContextImpl(nodeModulesAt);
	}
	static createSingleModuleContext(rootDir: string): SingleModuleContext {
			return new SingleModuleContext(rootDir);
	}
}

export = Eggnog;
