"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Option_1 = require("fp-ts/lib/Option");
var Reader_1 = require("fp-ts/lib/Reader");
var ts = require("typescript");
var M = require("./model");
var monocle_ts_1 = require("monocle-ts");
var A = require("fp-ts/lib/Array");
exports.defaultOptions = {
    tagName: 'type',
    foldName: 'fold',
    matcheeName: 'fa',
    handlersStyle: { type: 'positional' },
    encoding: 'literal'
};
var getLens = monocle_ts_1.Lens.fromProp();
exports.lenses = {
    tagName: getLens('tagName'),
    foldName: getLens('foldName'),
    matcheeName: getLens('matcheeName'),
    handlersStyle: getLens('handlersStyle'),
    encoding: getLens('encoding')
};
var getMemberName = function (m, position) {
    return m.name.getOrElseL(function () { return "value" + position; });
};
var getDomainParameterName = function (type) {
    switch (type.kind) {
        case 'Ref':
            return Option_1.some(getFirstLetterLowerCase(type.name));
        case 'Tuple':
            return Option_1.some('tuple');
        case 'Fun':
            return Option_1.some('f');
        case 'Unit':
            return Option_1.none;
    }
};
var getTypeNode = function (type) {
    switch (type.kind) {
        case 'Ref':
            return ts.createTypeReferenceNode(type.name, type.parameters.map(function (p) { return getTypeNode(p); }));
        case 'Tuple':
            return ts.createTupleTypeNode(type.types.map(getTypeNode));
        case 'Fun':
            return ts.createFunctionTypeNode(undefined, getDomainParameterName(type.domain)
                .map(function (domainName) { return [getParameterDeclaration(domainName, getTypeNode(type.domain))]; })
                .getOrElse(A.empty), getTypeNode(type.codomain));
        case 'Unit':
            return ts.createTypeReferenceNode('undefined', A.empty);
    }
};
var getDataLiteralEncoding = function (d) {
    return new Reader_1.Reader(function (e) {
        var unionType = ts.createUnionTypeNode(d.constructors.toArray().map(function (c) {
            var members = c.members.map(function (m, position) {
                return getPropertySignature(getMemberName(m, position), getTypeNode(m.type));
            });
            var tag = getPropertySignature(e.tagName, ts.createLiteralTypeNode(ts.createLiteral(c.name)));
            return ts.createTypeLiteralNode(M.isSum(d) ? [tag].concat(members) : members);
        }));
        return [getTypeAliasDeclaration(d.name, unionType, getDataTypeParameterDeclarations(d))];
    });
};
var getTypeAliasDeclaration = function (name, type, typeParameters) {
    return ts.createTypeAliasDeclaration(undefined, [ts.createModifier(ts.SyntaxKind.ExportKeyword)], name, typeParameters, type);
};
var getTypeParameterDeclaration = function (p) {
    return ts.createTypeParameterDeclaration(p.name, p.constraint.map(getTypeNode).toUndefined());
};
/**
 * @example
 * Constrained<A extends string>
 */
var getDataTypeParameterDeclarations = function (d) {
    return d.parameterDeclarations.map(getTypeParameterDeclaration);
};
/**
 * @example
 * Either<never, never>
 */
var getDataTypeReferenceWithNever = function (d) {
    return ts.createTypeReferenceNode(d.name, d.parameterDeclarations.map(function (_) { return ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword); }));
};
/**
 * @example
 * <L, R> in Either<L, R>
 */
var getDataTypeParameterReferences = function (d) {
    return d.parameterDeclarations.map(function (p) { return ts.createTypeReferenceNode(p.name, A.empty); });
};
/**
 * @example
 * Either<L, A>
 */
var getDataType = function (d) {
    return ts.createTypeReferenceNode(d.name, getDataTypeParameterReferences(d));
};
var URI2HKTNames = {
    1: 'URI2HKT',
    2: 'URI2HKT2',
    3: 'URI2HKT3',
    4: 'URI2HKT4'
};
var URI2HKTParametersNames = ['A', 'L', 'U', 'X'];
var getPropertySignature = function (name, type, isReadonly) {
    if (isReadonly === void 0) { isReadonly = true; }
    return ts.createPropertySignature(isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : undefined, name, undefined, type, undefined);
};
var getInterfaceDeclaration = function (name, typeParameters, members) {
    return ts.createInterfaceDeclaration(undefined, undefined, name, typeParameters, undefined, members);
};
var getDataModuleDeclaration = function (d) {
    var len = getDataParametersLength(d);
    var URI2HKT = URI2HKTNames[len];
    var parameters = URI2HKTParametersNames.slice(0, len).reverse();
    return ts.createModuleDeclaration(undefined, [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.createStringLiteral('fp-ts/lib/HKT'), ts.createModuleBlock([
        getInterfaceDeclaration(URI2HKT, parameters.map(function (p) { return ts.createTypeParameterDeclaration(p); }), [
            getPropertySignature(d.name, ts.createTypeReferenceNode(d.name, parameters.map(function (p) { return ts.createTypeReferenceNode(p, A.empty); })), false)
        ])
    ]), undefined);
};
var getPropertyDeclaration = function (name, type, inizializer, isExclamation) {
    if (isExclamation === void 0) { isExclamation = false; }
    return ts.createProperty(undefined, [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)], name, isExclamation ? ts.createToken(ts.SyntaxKind.ExclamationToken) : undefined, type, inizializer);
};
var getMethod = function (name, typeParameters, parameters, returnType, body) {
    return ts.createMethod(undefined, undefined, undefined, name, undefined, typeParameters, parameters, returnType, body);
};
var getFoldMethod = function (d, c, name, isEager) {
    var returnTypeParameterName = getFoldReturnTypeParameterName(d);
    var handlerExpression = ts.createIdentifier(getFoldHandlerName(c));
    var returnExpression = M.isNullary(c) && isEager
        ? handlerExpression
        : ts.createCall(handlerExpression, undefined, c.members.map(function (m, position) {
            return ts.createPropertyAccess(ts.createThis(), getMemberName(m, position));
        }));
    var fold = getMethod(name, [ts.createTypeParameterDeclaration(returnTypeParameterName)], getFoldPositionalHandlers(d, isEager, c), ts.createTypeReferenceNode(returnTypeParameterName, A.empty), ts.createBlock([ts.createReturn(returnExpression)]));
    return fold;
};
var when = function (condition, f) {
    return condition ? f() : A.empty;
};
var getDataFptsEncoding = function (d) {
    return new Reader_1.Reader(function (e) {
        var isSum = M.isSum(d);
        var isPolymorphic = M.isPolymorphic(d);
        var constructors = d.constructors.toArray();
        var classes = constructors.map(function (c) {
            var getStaticValueField = function () {
                return [
                    ts.createProperty(undefined, [ts.createModifier(ts.SyntaxKind.StaticKeyword)], 'value', undefined, ts.createTypeReferenceNode(d.name, d.parameterDeclarations.map(function (_) { return ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword); })), ts.createNew(ts.createIdentifier(c.name), undefined, A.empty))
                ];
            };
            var getTagField = function () {
                return [
                    getPropertyDeclaration(e.tagName, ts.createLiteralTypeNode(ts.createStringLiteral(c.name)), ts.createStringLiteral(c.name))
                ];
            };
            var getPolymorphicFields = function () {
                var URI = getPropertyDeclaration('_URI', ts.createTypeReferenceNode('URI', A.empty), undefined, true);
                var len = getDataParametersLength(d);
                var fptsParameters = URI2HKTParametersNames.slice(0, len).map(function (name) {
                    return getPropertyDeclaration("_" + name, ts.createTypeReferenceNode(name, A.empty), undefined, true);
                });
                return fptsParameters.concat([URI]);
            };
            var isNullary = M.isNullary(c);
            var constructor = ts.createConstructor(undefined, isNullary ? [ts.createModifier(ts.SyntaxKind.PrivateKeyword)] : undefined, c.members.map(function (m, position) { return getParameterDeclaration(getMemberName(m, position), getTypeNode(m.type), true); }), ts.createBlock([]));
            var getFoldMethods = function () {
                if (isEagerFoldSupported(d)) {
                    return [getFoldMethod(d, c, e.foldName, true), getFoldMethod(d, c, e.foldName + "L", false)];
                }
                else {
                    return [getFoldMethod(d, c, e.foldName, false)];
                }
            };
            var members = when(isNullary, getStaticValueField).concat(when(isSum, getTagField), when(isPolymorphic, getPolymorphicFields), [
                constructor
            ], when(isSum, getFoldMethods));
            return ts.createClassDeclaration(undefined, [ts.createModifier(ts.SyntaxKind.ExportKeyword)], c.name, getDataTypeParameterDeclarations(d), undefined, members);
        });
        var getModuleAugmentation = function () {
            return [
                getDataModuleDeclaration(d),
                getConstantDeclaration('URI', ts.createStringLiteral(d.name)),
                getTypeAliasDeclaration('URI', ts.createTypeQueryNode(ts.createIdentifier('URI')))
            ];
        };
        var getTypeAlias = function () {
            var unionType = ts.createUnionTypeNode(constructors.map(function (c) {
                return ts.createTypeReferenceNode(c.name, getDataTypeParameterReferences(d));
            }));
            return [getTypeAliasDeclaration(d.name, unionType, getDataTypeParameterDeclarations(d))];
        };
        var prelude = when(isPolymorphic, getModuleAugmentation).concat(when(isSum || d.constructors.head.name !== d.name, getTypeAlias));
        return prelude.concat(classes);
    });
};
var getDataParametersLength = function (d) {
    return d.parameterDeclarations.length;
};
var shouldUseLiteralEncoding = function (d) {
    return new Reader_1.Reader(function (e) { return e.encoding === 'literal' || getDataParametersLength(d) > URI2HKTParametersNames.length; });
};
exports.data = function (d) {
    return shouldUseLiteralEncoding(d).chain(function (yes) { return (yes ? getDataLiteralEncoding(d) : getDataFptsEncoding(d)); });
};
var getFirstLetterLowerCase = function (name) {
    return name.substring(0, 1).toLocaleLowerCase() + name.substring(1);
};
var getConstantDeclaration = function (name, initializer, type) {
    return ts.createVariableStatement([ts.createModifier(ts.SyntaxKind.ExportKeyword)], ts.createVariableDeclarationList([ts.createVariableDeclaration(name, type, initializer)], ts.NodeFlags.Const));
};
var getFunctionDeclaration = function (name, typeParameters, parameters, type, body) {
    return ts.createFunctionDeclaration(undefined, [ts.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, name, typeParameters, parameters, type, body);
};
var getParameterDeclaration = function (name, type, isReadonly) {
    if (isReadonly === void 0) { isReadonly = false; }
    return ts.createParameter(undefined, isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : undefined, undefined, name, undefined, type, undefined);
};
var getLiteralNullaryConstructor = function (c, d) {
    return new Reader_1.Reader(function (e) {
        var name = getFirstLetterLowerCase(c.name);
        var initializer = ts.createObjectLiteral(M.isSum(d) ? [ts.createPropertyAssignment(e.tagName, ts.createStringLiteral(c.name))] : []);
        return getConstantDeclaration(name, initializer, getDataTypeReferenceWithNever(d));
    });
};
var getLiteralConstructor = function (c, d) {
    return new Reader_1.Reader(function (e) {
        var name = getFirstLetterLowerCase(c.name);
        var typeParameters = d.parameterDeclarations
            .filter(function (p) { return c.members.some(function (m) { return M.typeUsesTypeParameter(m.type, p.name); }); })
            .map(getTypeParameterDeclaration);
        var parameters = c.members.map(function (m, position) {
            var name = getMemberName(m, position);
            var type = getTypeNode(m.type);
            return getParameterDeclaration(name, type);
        });
        var properties = c.members.map(function (m, position) {
            var name = getMemberName(m, position);
            return ts.createShorthandPropertyAssignment(name);
        });
        var body = ts.createBlock([
            ts.createReturn(ts.createObjectLiteral(M.isSum(d)
                ? [ts.createPropertyAssignment(e.tagName, ts.createStringLiteral(c.name))].concat(properties) : properties))
        ]);
        var type = ts.createTypeReferenceNode(d.name, d.parameterDeclarations.map(function (p) {
            return c.members.some(function (m) { return M.typeUsesTypeParameter(m.type, p.name); })
                ? ts.createTypeReferenceNode(p.name, A.empty)
                : ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
        }));
        return getFunctionDeclaration(name, typeParameters, parameters, type, body);
    });
};
var getConstructorsLiteralEncoding = function (d) {
    var constructors = d.constructors
        .toArray()
        .map(function (c) { return A.foldL(c.members, function () { return getLiteralNullaryConstructor(c, d); }, function () { return getLiteralConstructor(c, d); }); });
    return A.array.sequence(Reader_1.reader)(constructors);
};
var getFptsNullaryConstructor = function (c, d) {
    return new Reader_1.Reader(function (_) {
        var name = getFirstLetterLowerCase(c.name);
        var initializer = ts.createPropertyAccess(ts.createIdentifier(c.name), 'value');
        return getConstantDeclaration(name, initializer, getDataTypeReferenceWithNever(d));
    });
};
var getFptsConstructor = function (c, d) {
    return new Reader_1.Reader(function (_) {
        var name = getFirstLetterLowerCase(c.name);
        var typeParameters = d.parameterDeclarations
            .filter(function (p) { return c.members.some(function (m) { return M.typeUsesTypeParameter(m.type, p.name); }); })
            .map(getTypeParameterDeclaration);
        var parameters = c.members.map(function (m, position) {
            var name = getMemberName(m, position);
            var type = getTypeNode(m.type);
            return getParameterDeclaration(name, type);
        });
        var body = ts.createBlock([
            ts.createReturn(ts.createNew(ts.createIdentifier(c.name), undefined, c.members.map(function (m, position) {
                return ts.createIdentifier(getMemberName(m, position));
            })))
        ]);
        var type = ts.createTypeReferenceNode(d.name, d.parameterDeclarations.map(function (p) {
            return c.members.some(function (m) { return M.typeUsesTypeParameter(m.type, p.name); })
                ? ts.createTypeReferenceNode(p.name, A.empty)
                : ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
        }));
        return getFunctionDeclaration(name, typeParameters, parameters, type, body);
    });
};
var getConstructorsFptsEncoding = function (d) {
    var constructors = d.constructors
        .toArray()
        .map(function (c) { return A.foldL(c.members, function () { return getFptsNullaryConstructor(c, d); }, function () { return getFptsConstructor(c, d); }); });
    return A.array.sequence(Reader_1.reader)(constructors);
};
exports.constructors = function (d) {
    return shouldUseLiteralEncoding(d).chain(function (yes) {
        return yes ? getConstructorsLiteralEncoding(d) : getConstructorsFptsEncoding(d);
    });
};
var isEagerFoldSupported = function (d) {
    return d.constructors.toArray().some(M.isNullary);
};
var getFoldReturnTypeParameterName = function (d) {
    var base = 'R';
    var candidate = base;
    var counter = 0;
    while (d.parameterDeclarations.findIndex(function (_a) {
        var name = _a.name;
        return candidate === name;
    }) !== -1) {
        candidate = base + ++counter;
    }
    return candidate;
};
var getFoldHandlerName = function (c) {
    return "on" + c.name;
};
var getFoldPositionalHandlers = function (d, isEager, usedConstructor) {
    var returnTypeParameterName = getFoldReturnTypeParameterName(d);
    return d.constructors.toArray().map(function (c) {
        var type = isEager && M.isNullary(c)
            ? ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
            : ts.createFunctionTypeNode(undefined, c.members.map(function (m, position) { return getParameterDeclaration(getMemberName(m, position), getTypeNode(m.type)); }), ts.createTypeReferenceNode(returnTypeParameterName, A.empty));
        var isParameterUnused = usedConstructor !== undefined && usedConstructor !== c;
        var foldHandlerName = isParameterUnused ? "_" + getFoldHandlerName(c) : getFoldHandlerName(c);
        return getParameterDeclaration(foldHandlerName, type);
    });
};
var getFoldRecordHandlers = function (d, handlersName, isEager) {
    var returnTypeParameterName = getFoldReturnTypeParameterName(d);
    var type = ts.createTypeLiteralNode(d.constructors.toArray().map(function (c) {
        var type = isEager && M.isNullary(c)
            ? ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
            : ts.createFunctionTypeNode(undefined, c.members.map(function (m, position) { return getParameterDeclaration(getMemberName(m, position), getTypeNode(m.type)); }), ts.createTypeReferenceNode(returnTypeParameterName, A.empty));
        return getPropertySignature(getFoldHandlerName(c), type, false);
    }));
    return [getParameterDeclaration(handlersName, type)];
};
var getFoldPositionalBody = function (d, matcheeName, tagName, isEager) {
    return ts.createBlock([
        ts.createSwitch(ts.createPropertyAccess(ts.createIdentifier(matcheeName), tagName), ts.createCaseBlock(d.constructors.toArray().map(function (c) {
            var access = ts.createIdentifier(getFoldHandlerName(c));
            return ts.createCaseClause(ts.createStringLiteral(c.name), [
                ts.createReturn(isEager && M.isNullary(c)
                    ? access
                    : ts.createCall(access, A.empty, c.members.map(function (m, position) {
                        return ts.createPropertyAccess(ts.createIdentifier(matcheeName), getMemberName(m, position));
                    })))
            ]);
        })))
    ]);
};
var getFoldRecordBody = function (d, matcheeName, tagName, handlersName, isEager) {
    return ts.createBlock([
        ts.createSwitch(ts.createPropertyAccess(ts.createIdentifier(matcheeName), tagName), ts.createCaseBlock(d.constructors.toArray().map(function (c) {
            var access = ts.createPropertyAccess(ts.createIdentifier(handlersName), getFoldHandlerName(c));
            return ts.createCaseClause(ts.createStringLiteral(c.name), [
                ts.createReturn(isEager && M.isNullary(c)
                    ? access
                    : ts.createCall(access, A.empty, c.members.map(function (m, position) {
                        return ts.createPropertyAccess(ts.createIdentifier(matcheeName), getMemberName(m, position));
                    })))
            ]);
        })))
    ]);
};
var getFold = function (d, name, isEager) {
    return new Reader_1.Reader(function (e) {
        var matcheeName = e.matcheeName;
        var tagName = e.tagName;
        var handlersStyle = e.handlersStyle;
        var returnTypeParameterName = getFoldReturnTypeParameterName(d);
        var typeParameterDeclarations = getDataTypeParameterDeclarations(d).concat([
            ts.createTypeParameterDeclaration(returnTypeParameterName)
        ]);
        var matchee = getParameterDeclaration(matcheeName, getDataType(d));
        var handlers = handlersStyle.type === 'positional'
            ? getFoldPositionalHandlers(d, isEager)
            : getFoldRecordHandlers(d, handlersStyle.handlersName, isEager);
        var parameters = [matchee].concat(handlers);
        var returnType = ts.createTypeReferenceNode(returnTypeParameterName, A.empty);
        var body = handlersStyle.type === 'positional'
            ? getFoldPositionalBody(d, matcheeName, tagName, isEager)
            : getFoldRecordBody(d, matcheeName, tagName, handlersStyle.handlersName, isEager);
        return getFunctionDeclaration(name, typeParameterDeclarations, parameters, returnType, body);
    });
};
exports.folds = function (d) {
    return Reader_1.ask().chain(function (e) {
        var folds = A.empty;
        if (e.encoding === 'literal') {
            if (M.isSum(d)) {
                if (isEagerFoldSupported(d)) {
                    folds = [getFold(d, e.foldName, true), getFold(d, e.foldName + "L", false)];
                }
                else {
                    folds = [getFold(d, e.foldName, false)];
                }
            }
        }
        return A.array.sequence(Reader_1.reader)(folds);
    });
};
var getImportDeclaration = function (namedImports, from) {
    return ts.createImportDeclaration(A.empty, A.empty, ts.createImportClause(undefined, ts.createNamedImports(namedImports.map(function (name) { return ts.createImportSpecifier(undefined, ts.createIdentifier(name)); }))), ts.createStringLiteral(from));
};
var getArrowFunction = function (parameters, body) {
    return ts.createArrowFunction([], A.empty, parameters.map(function (p) { return getParameterDeclaration(p); }), undefined, undefined, body);
};
exports.prisms = function (d) {
    return Reader_1.ask().chain(function (e) {
        if (!M.isSum(d)) {
            return Reader_1.reader.of(A.empty);
        }
        var dataType = getDataType(d);
        var type = ts.createTypeReferenceNode('Prism', [dataType, dataType]);
        var getPrism = function (name) {
            return ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Prism'), 'fromPredicate'), A.empty, [
                getArrowFunction(['s'], getStrictEquals(ts.createPropertyAccess(ts.createIdentifier('s'), e.tagName), ts.createStringLiteral(name)))
            ]);
        };
        var monocleImport = getImportDeclaration(['Prism'], 'monocle-ts');
        var typeParameters = getDataTypeParameterDeclarations(d);
        var constructors = d.constructors.toArray();
        if (M.isPolymorphic(d)) {
            return Reader_1.reader.of([
                monocleImport
            ].concat(constructors.map(function (c) {
                var body = ts.createBlock([ts.createReturn(getPrism(c.name))]);
                return getFunctionDeclaration("_" + getFirstLetterLowerCase(c.name), typeParameters, A.empty, type, body);
            })));
        }
        return Reader_1.reader.of([
            monocleImport
        ].concat(constructors.map(function (c) {
            return getConstantDeclaration("_" + c.name, getPrism(c.name), type);
        })));
    });
};
exports.unaryPrisms = function (d) {
    return Reader_1.ask().chain(function (e) {
        if (!M.isSum(d)) {
            return Reader_1.reader.of(A.empty);
        }
        var unaryConstructors = d.constructors.toArray().filter(function (c) { return c.members.length === 1; });
        if (unaryConstructors.length === 0) {
            return Reader_1.reader.of(A.empty);
        }
        var getType = function (m) {
            return ts.createTypeReferenceNode('Prism', [getDataType(d), getTypeNode(m.type)]);
        };
        var getPrism = function (m, name) {
            return ts.createNew(ts.createIdentifier('Prism'), undefined, [
                getArrowFunction([e.matcheeName], ts.createConditional(getStrictEquals(ts.createPropertyAccess(ts.createIdentifier(e.matcheeName), e.tagName), ts.createStringLiteral(name)), ts.createToken(ts.SyntaxKind.QuestionToken), ts.createCall(ts.createIdentifier('optionSome'), undefined, [
                    ts.createPropertyAccess(ts.createIdentifier(e.matcheeName), getMemberName(m, 0))
                ]), ts.createToken(ts.SyntaxKind.ColonToken), ts.createIdentifier('optionNone'))),
                getArrowFunction(['value'], ts.createCall(ts.createIdentifier("" + getFirstLetterLowerCase(name)), undefined, [
                    ts.createIdentifier('value')
                ]))
            ]);
        };
        var optionConstructorsImport = ts.createImportDeclaration(A.empty, A.empty, ts.createImportClause(undefined, ts.createNamedImports([
            ts.createImportSpecifier(ts.createIdentifier('some'), ts.createIdentifier('optionSome')),
            ts.createImportSpecifier(ts.createIdentifier('none'), ts.createIdentifier('optionNone'))
        ])), ts.createStringLiteral('fp-ts/lib/Option'));
        if (M.isPolymorphic(d)) {
            var typeParameters_1 = getDataTypeParameterDeclarations(d);
            return Reader_1.reader.of([
                optionConstructorsImport
            ].concat(unaryConstructors.map(function (c) {
                var m = c.members[0];
                var body = ts.createBlock([ts.createReturn(getPrism(m, c.name))]);
                return getFunctionDeclaration("get" + c.name + "Prism", typeParameters_1, A.empty, getType(m), body);
            })));
        }
        return Reader_1.reader.of([
            optionConstructorsImport
        ].concat(unaryConstructors.map(function (c) {
            var m = c.members[0];
            return getConstantDeclaration(getFirstLetterLowerCase(c.name) + "Prism", getPrism(m, c.name), getType(m));
        })));
    });
};
var getStrictEquals = function (left, right) {
    return ts.createBinary(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right);
};
