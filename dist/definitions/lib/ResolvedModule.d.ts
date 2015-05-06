import Resolver = require('./Resolver');
import Scope = require('./Scope');
interface ResolvedModule {
    id: string;
    dir: string;
    deps: Array<string>;
    scope: Scope;
    externals: Array<string>;
    globals: Array<string>;
    init(eggnog: Resolver): any;
}
export = ResolvedModule;
