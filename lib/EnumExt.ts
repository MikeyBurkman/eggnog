
// Borrowed from http://stackoverflow.com/a/21294925
class EnumExt {
    static getNames(e: any): Array<string> {
        var a: Array<string> = [];
        for (var val in e) {
            if (isNaN(val)) {
                a.push(val);
            }
        }
        return a;
    }

    static getValues(e: any): Array<number> {
        var a: Array<number> = [];
        for (var val in e) {
            if (!isNaN(val)) {
                a.push(parseInt(val, 10));
            }
        }
        return a;
    }

    static getName(e: any, value: number): string {
      return e[value];
    }
}

export = EnumExt;
