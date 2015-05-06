import Resolver = require('./Resolver');
import Scope = require('./Scope');
interface EggnogModule {
    init(eggnog: Resolver): any;
    _id?: string;
    locals?: Array<string>;
    externals?: Array<string>;
    globals?: Array<string>;
    isMain?: boolean;
    scope?: Scope;
}
export = EggnogModule;
