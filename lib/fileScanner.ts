
import Utils = require('./Utils');
import glob = require('glob');

export class ScanResult {
	fileName: string;
	directory: string;
	loadedModule: any;
	constructor(fileName: string, directory: string, loadedModule: any) {
		this.fileName = fileName;
		this.directory = directory;
		this.loadedModule = loadedModule;
	}
}

export interface ScanArgs {
	baseDir: string;
	exclude?(fname: string): boolean;
}

export function scan(args: ScanArgs) : Array<ScanResult> {
	var baseDir = args.baseDir;
	var excludeFn = args.exclude || function(fname: string) { return false };

	var baseDirLen = baseDir.length;

	var searchDir = baseDir + "/**/*.js";
	var filenames = glob.sync(searchDir);

	var results:Array<ScanResult> = [];

	Utils.each(filenames, function(name) {
		var d = name.substr(baseDirLen+1);
		if (!excludeFn(d)) {
			var m = require(name);
			if (m) {
				results.push(new ScanResult(name, d, m));
			}
		}
	});

	return results;
}
