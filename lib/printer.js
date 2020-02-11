"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var Ast = require("./ast");
var Reader_1 = require("fp-ts/lib/Reader");
var Mon = require("fp-ts/lib/Monoid");
var Array_1 = require("fp-ts/lib/Array");
exports.ast = function (ast) {
    var printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });
    var source = ts.createSourceFile('', '', ts.ScriptTarget.Latest);
    return printer.printNode(ts.EmitHint.Unspecified, ast, source);
};
exports.data = function (d) {
    return Ast.data(d).map(function (declarations) { return declarations.map(exports.ast).join('\n\n'); });
};
exports.constructors = function (d) {
    return Ast.constructors(d).map(function (nodes) { return nodes.map(exports.ast); });
};
exports.folds = function (d) {
    return Ast.folds(d).map(function (functionDeclarations) { return functionDeclarations.map(exports.ast); });
};
exports.prisms = function (d) {
    return Ast.prisms(d).map(function (nodes) { return nodes.map(exports.ast); });
};
exports.unaryPrisms = function (d) {
    return Ast.unaryPrisms(d).map(function (nodes) { return nodes.map(exports.ast); });
};
exports.getMonoid = function (M) {
    return {
        concat: function (x, y) { return new Reader_1.Reader(function (e) { return M.concat(x.run(e), y.run(e)); }); },
        empty: Reader_1.reader.of(M.empty)
    };
};
var monoidPrinter = exports.getMonoid(Mon.getArrayMonoid());
exports.all = function (d) {
    return Mon.fold(monoidPrinter)([exports.data(d).map(Array_1.array.of), exports.constructors(d), exports.folds(d), exports.prisms(d), exports.unaryPrisms(d)]);
};
exports.print = function (d, options) {
    return exports.all(d)
        .run(options)
        .join('\n\n');
};
