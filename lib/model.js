"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var NonEmptyArray_1 = require("fp-ts/lib/NonEmptyArray");
var Option_1 = require("fp-ts/lib/Option");
exports.ref = function (name, parameters) {
    if (parameters === void 0) { parameters = []; }
    return ({
        kind: 'Ref',
        name: name,
        parameters: parameters
    });
};
exports.tuple = function (types) { return ({
    kind: 'Tuple',
    types: types
}); };
exports.unit = { kind: 'Unit' };
exports.fun = function (domain, codomain) { return ({
    kind: 'Fun',
    domain: domain,
    codomain: codomain
}); };
exports.member = function (type, name) {
    if (name === void 0) { name = Option_1.none; }
    return ({
        type: type,
        name: name
    });
};
exports.constructor = function (name, members) {
    if (members === void 0) { members = []; }
    return ({
        name: name,
        members: members
    });
};
exports.parameterDeclaration = function (name, constraint) {
    if (constraint === void 0) { constraint = Option_1.none; }
    return ({
        name: name,
        constraint: constraint
    });
};
exports.data = function (name, parameterDeclarations, head, tail) {
    if (tail === void 0) { tail = []; }
    return ({
        name: name,
        parameterDeclarations: parameterDeclarations,
        constructors: new NonEmptyArray_1.NonEmptyArray(head, tail)
    });
};
exports.isNullary = function (c) {
    return c.members.length === 0;
};
exports.isPolymorphic = function (d) {
    return d.parameterDeclarations.length > 0;
};
exports.isSum = function (d) {
    return d.constructors.length() > 1;
};
exports.isEnum = function (d) {
    return d.constructors.toArray().every(exports.isNullary);
};
exports.typeUsesTypeParameter = function (t, id) {
    switch (t.kind) {
        case 'Unit':
            return false;
        case 'Tuple':
            return t.types.some(function (tt) { return exports.typeUsesTypeParameter(tt, id); });
        case 'Fun':
            return exports.typeUsesTypeParameter(t.domain, id) || exports.typeUsesTypeParameter(t.codomain, id);
        case 'Ref':
            return t.name === id || t.parameters.some(function (tt) { return exports.typeUsesTypeParameter(tt, id); });
    }
};
