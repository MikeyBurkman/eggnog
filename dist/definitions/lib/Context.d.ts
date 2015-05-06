interface Context {
    getMainModuleId(): string;
    addDirectory(baseDir: string): Array<string>;
    printDependencies(id: string, prefix?: string): void;
    loadModule(id: string): any;
    main(): any;
}
export = Context;
