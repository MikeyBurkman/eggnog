import Context = require('./Context');
import ResolvedModule = require('./ResolvedModule');
import EggnogModule = require("./EggnogModule");
declare class ContextImpl implements Context {
    private nodeModulesAt;
    private externalResolverFn(id);
    private globalResolverFn(id);
    private static validMappingProperties;
    private mappings;
    private extMappings;
    private mainModule;
    private resolved;
    private resolving;
    constructor(nodeModulesAt?: string, externalResolverFn?: (id: string) => any, globalResolverFn?: (id: string) => any);
    getMainModuleId(): string;
    main(): any;
    addDirectory(baseDir: string): Array<string>;
    addMapping(eggnogModule: EggnogModule, idPrefix?: string, directory?: string): ResolvedModule;
    loadModule(id: string, parent?: ResolvedModule): any;
    printDependencies(id: string, prefix?: string): void;
    private nodeJsGlobalResolver(id);
    private loadExternalFromRequire(id);
    private allExternalIds();
    private verifyMappingProperties(mapping);
    private findSimilarMappings(id);
}
export = ContextImpl;
