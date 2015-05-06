var EnumExt = (function () {
    function EnumExt() {
    }
    EnumExt.getNames = function (e) {
        var a = [];
        for (var val in e) {
            if (isNaN(val)) {
                a.push(val);
            }
        }
        return a;
    };
    EnumExt.getValues = function (e) {
        var a = [];
        for (var val in e) {
            if (!isNaN(val)) {
                a.push(parseInt(val, 10));
            }
        }
        return a;
    };
    EnumExt.getName = function (e, value) {
        return e[value];
    };
    return EnumExt;
})();
module.exports = EnumExt;
