export declare class ScanResult {
    fileName: string;
    directory: string;
    loadedModule: any;
    constructor(fileName: string, directory: string, loadedModule: any);
}
export interface ScanArgs {
    baseDir: string;
    exclude?(fname: string): boolean;
}
export declare function scan(args: ScanArgs): Array<ScanResult>;
