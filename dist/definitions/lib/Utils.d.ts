declare class Utils {
    static each(o: any, fn: (arg: any, i: any) => any, scope?: any): Array<any>;
    static moduleIdFromDirectory(directory: string, idPrefix?: string): string;
    static directoryFromModuleId(moduleId: string): string;
    static findSimilar(str: string, arr: Array<string>): Array<string>;
    static strEndsWith(str: string, val: string): boolean;
    static contains<T>(arr: Array<T>, obj: T): boolean;
    static mergeObjects(root: any, other: any): any;
    static isString(o: any): boolean;
    static lDist(str1: string, str2: string): number;
    static objectKeys(obj: any): Array<string>;
}
export = Utils;
