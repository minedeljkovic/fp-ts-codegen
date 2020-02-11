"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var haskell_1 = require("./haskell");
var printer_1 = require("./printer");
var ast_1 = require("./ast");
function run(input, options) {
    if (options === void 0) { options = ast_1.defaultOptions; }
    return haskell_1.parse(input).map(function (data) { return printer_1.print(data, options); });
}
exports.run = run;
