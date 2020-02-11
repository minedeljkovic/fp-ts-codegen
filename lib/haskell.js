"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var P = require("parser-ts");
var S = require("parser-ts/lib/string");
var C = require("parser-ts/lib/char");
var M = require("./model");
var Option_1 = require("fp-ts/lib/Option");
var isDigit = function (c) { return '0123456789'.indexOf(c) !== -1; };
var isPunctuation = function (c) { return '| =\n():,{};[]->'.indexOf(c) !== -1; };
var identifierFirstLetter = P.sat(function (c) { return !isDigit(c) && !isPunctuation(c); });
var identifierBody = P.sat(function (c) { return !isPunctuation(c); });
var expected = function (message, parser) {
    return P.expectedL(parser, function (remaining) { return "Expected " + message + ", cannot parse " + JSON.stringify(remaining); });
};
exports.identifier = expected('an identifier', P.fold([identifierFirstLetter, C.many(identifierBody)]));
var leftParens = P.fold([C.char('('), S.spaces]);
var rightParens = P.fold([S.spaces, C.char(')')]);
var withParens = function (parser) {
    return leftParens.applySecond(parser).applyFirst(rightParens);
};
var unparametrizedRef = exports.identifier.map(function (name) { return M.ref(name); });
exports.ref = exports.identifier.chain(function (name) {
    return S.spaces.applySecond(exports.types.map(function (parameters) { return M.ref(name, parameters); }));
});
var comma = P.fold([S.spaces, C.char(','), S.spaces]);
exports.tuple = expected('a tuple', leftParens
    .chain(function () {
    return P.sepBy(comma, exports.type).map(function (types) {
        switch (types.length) {
            case 0:
                return M.unit;
            case 1:
                return types[0];
            default:
                return M.tuple(types);
        }
    });
})
    .applyFirst(rightParens));
var arrow = P.fold([S.spaces, S.string('->'), S.spaces]);
exports.fun = expected('a function type', S.spaces.chain(function () { return exports.ref.alt(exports.tuple).chain(function (domain) { return arrow.applySecond(exports.type).map(function (codomain) { return M.fun(domain, codomain); }); }); }));
exports.type = exports.fun.alt(exports.ref).alt(exports.tuple);
exports.types = P.sepBy(S.spaces, exports.fun
    .alt(unparametrizedRef)
    .alt(withParens(exports.ref))
    .alt(exports.tuple));
var pair = exports.identifier.chain(function (name) {
    return P.fold([S.spaces, S.string('::'), S.spaces])
        .applySecond(exports.type)
        .map(function (type) { return ({ name: name, type: type }); });
});
var pairs = P.fold([C.char('{'), S.spaces])
    .applySecond(P.sepBy(comma, pair))
    .applyFirst(P.fold([S.spaces, C.char('}')]));
var recordConstructor = exports.identifier.chain(function (name) {
    return S.spaces.applySecond(pairs.map(function (pairs) { return M.constructor(name, pairs.map(function (_a) {
        var name = _a.name, type = _a.type;
        return M.member(type, Option_1.some(name));
    })); }));
});
var positionalConstructor = exports.identifier.chain(function (name) {
    return S.spaces.applySecond(exports.types.map(function (types) { return M.constructor(name, types.map(function (type) { return M.member(type); })); }));
});
exports.constructor = recordConstructor.alt(positionalConstructor);
var equal = P.fold([S.spaces, C.char('='), S.spaces]);
var unconstrainedParameterDeclaration = exports.identifier.map(function (name) {
    return M.parameterDeclaration(name);
});
var constrainedParameterDeclaration = P.fold([C.char('('), S.spaces]).applySecond(pair.map(function (_a) {
    var name = _a.name, type = _a.type;
    return M.parameterDeclaration(name, Option_1.some(type));
}).applyFirst(P.fold([S.spaces, C.char(')')])));
exports.parameterDeclaration = expected('a parameter', unconstrainedParameterDeclaration.alt(constrainedParameterDeclaration));
var pipe = P.fold([S.spaces, C.char('|'), S.spaces]);
exports.data = expected('a data declaration', S.string('data').chain(function () {
    return S.spaces.applySecond(exports.identifier.chain(function (name) {
        return S.spaces
            .applySecond(P.sepBy(S.spaces, exports.parameterDeclaration))
            .applyFirst(equal)
            .chain(function (typeParameters) {
            return P.sepBy1(pipe, exports.constructor)
                .map(function (constructors) { return M.data(name, typeParameters, constructors.head, constructors.tail); })
                .applyFirst(S.spaces)
                .applyFirst(P.eof);
        });
    }));
}));
exports.parse = function (s) {
    return exports.data.run(s).bimap(function (e) { return e.message; }, function (_a) {
        var data = _a[0];
        return data;
    });
};
