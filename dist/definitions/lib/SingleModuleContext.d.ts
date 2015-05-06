declare class SingleModuleContext {
    private rootDir;
    constructor(rootDir: string);
    buildModule<T>(moduleId: string, opts?: {
        locals?: {
            [id: string]: any;
        };
        externals?: {
            [id: string]: any;
        };
        globals?: {
            [id: string]: any;
        };
    }): T;
}
export = SingleModuleContext;
