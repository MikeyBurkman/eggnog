declare module "levenshtein" {
  class Levenshtein {
    constructor(str1: string, str2: string);
    distance: number;
  }

  export = Levenshtein;
}
