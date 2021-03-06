import { none, Option, some } from 'fp-ts/lib/Option'
import { Reader, reader, ask } from 'fp-ts/lib/Reader'
import * as ts from 'typescript'
import * as M from './model'
import { Lens } from 'monocle-ts'
import * as A from 'fp-ts/lib/Array'

export interface Options {
  /** the name of the field used as tag */
  tagName: string
  /** the name prefix used for pattern matching functions */
  foldName: string
  /** the name used for the input of pattern matching functions */
  matcheeName: string
  /**
   * the pattern matching handlers can be expressed as positional arguments
   * or a single object literal `tag -> handler`
   */
  handlersStyle: { type: 'positional' } | { type: 'record'; handlersName: string }
  encoding: 'literal' | 'fp-ts'
}

export const defaultOptions: Options = {
  tagName: 'type',
  foldName: 'fold',
  matcheeName: 'fa',
  handlersStyle: { type: 'positional' },
  encoding: 'literal'
}

const getLens = Lens.fromProp<Options>()

export const lenses: { [K in keyof Options]: Lens<Options, Options[K]> } = {
  tagName: getLens('tagName'),
  foldName: getLens('foldName'),
  matcheeName: getLens('matcheeName'),
  handlersStyle: getLens('handlersStyle'),
  encoding: getLens('encoding')
}

export interface AST<A> extends Reader<Options, A> {}

const getMemberName = (m: M.Member, position: number): string => {
  return m.name.getOrElseL(() => `value${position}`)
}

const getDomainParameterName = (type: M.Type): Option<string> => {
  switch (type.kind) {
    case 'Ref':
      return some(getFirstLetterLowerCase(type.name))
    case 'Tuple':
      return some('tuple')
    case 'Fun':
      return some('f')
    case 'Unit':
      return none
  }
}

const getTypeNode = (type: M.Type): ts.TypeNode => {
  switch (type.kind) {
    case 'Ref':
      return ts.createTypeReferenceNode(type.name, type.parameters.map(p => getTypeNode(p)))
    case 'Tuple':
      return ts.createTupleTypeNode(type.types.map(getTypeNode))
    case 'Fun':
      return ts.createFunctionTypeNode(
        undefined,
        getDomainParameterName(type.domain)
          .map(domainName => [getParameterDeclaration(domainName, getTypeNode(type.domain))])
          .getOrElse(A.empty),
        getTypeNode(type.codomain)
      )
    case 'Unit':
      return ts.createTypeReferenceNode('undefined', A.empty)
  }
}

const getDataLiteralEncoding = (d: M.Data): AST<Array<ts.Node>> => {
  return new Reader(e => {
    const unionType = ts.createUnionTypeNode(
      d.constructors.toArray().map(c => {
        const members: Array<ts.TypeElement> = c.members.map((m, position) => {
          return getPropertySignature(getMemberName(m, position), getTypeNode(m.type))
        })
        const tag: ts.TypeElement = getPropertySignature(e.tagName, ts.createLiteralTypeNode(ts.createLiteral(c.name)))
        return ts.createTypeLiteralNode(M.isSum(d) ? [tag, ...members] : members)
      })
    )
    return [getTypeAliasDeclaration(d.name, unionType, getDataTypeParameterDeclarations(d))]
  })
}

const getTypeAliasDeclaration = (
  name: string,
  type: ts.TypeNode,
  typeParameters?: Array<ts.TypeParameterDeclaration>
) => {
  return ts.createTypeAliasDeclaration(
    undefined,
    [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    typeParameters,
    type
  )
}

const getTypeParameterDeclaration = (p: M.ParameterDeclaration): ts.TypeParameterDeclaration => {
  return ts.createTypeParameterDeclaration(p.name, p.constraint.map(getTypeNode).toUndefined())
}

/**
 * @example
 * Constrained<A extends string>
 */
const getDataTypeParameterDeclarations = (d: M.Data): Array<ts.TypeParameterDeclaration> => {
  return d.parameterDeclarations.map(getTypeParameterDeclaration)
}

/**
 * @example
 * Either<never, never>
 */
const getDataTypeReferenceWithNever = (d: M.Data): ts.TypeReferenceNode => {
  return ts.createTypeReferenceNode(
    d.name,
    d.parameterDeclarations.map(_ => ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword))
  )
}

/**
 * @example
 * <L, R> in Either<L, R>
 */
const getDataTypeParameterReferences = (d: M.Data): Array<ts.TypeReferenceNode> => {
  return d.parameterDeclarations.map(p => ts.createTypeReferenceNode(p.name, A.empty))
}

/**
 * @example
 * Either<L, A>
 */
const getDataType = (d: M.Data): ts.TypeReferenceNode => {
  return ts.createTypeReferenceNode(d.name, getDataTypeParameterReferences(d))
}

const URI2HKTNames: Record<number, string> = {
  1: 'URI2HKT',
  2: 'URI2HKT2',
  3: 'URI2HKT3',
  4: 'URI2HKT4'
}
const URI2HKTParametersNames = ['A', 'L', 'U', 'X']

const getPropertySignature = (name: string, type: ts.TypeNode, isReadonly: boolean = true): ts.PropertySignature => {
  return ts.createPropertySignature(
    isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : undefined,
    name,
    undefined,
    type,
    undefined
  )
}

const getInterfaceDeclaration = (
  name: string,
  typeParameters: Array<ts.TypeParameterDeclaration>,
  members: Array<ts.TypeElement>
): ts.InterfaceDeclaration => {
  return ts.createInterfaceDeclaration(undefined, undefined, name, typeParameters, undefined, members)
}

const getDataModuleDeclaration = (d: M.Data): ts.ModuleDeclaration => {
  const len = getDataParametersLength(d)
  const URI2HKT = URI2HKTNames[len]
  const parameters = URI2HKTParametersNames.slice(0, len).reverse()

  return ts.createModuleDeclaration(
    undefined,
    [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
    ts.createStringLiteral('fp-ts/lib/HKT'),
    ts.createModuleBlock([
      getInterfaceDeclaration(URI2HKT, parameters.map(p => ts.createTypeParameterDeclaration(p)), [
        getPropertySignature(
          d.name,
          ts.createTypeReferenceNode(d.name, parameters.map(p => ts.createTypeReferenceNode(p, A.empty))),
          false
        )
      ])
    ]),
    undefined
  )
}

const getPropertyDeclaration = (
  name: string,
  type: ts.TypeNode,
  inizializer?: ts.Expression,
  isExclamation: boolean = false
): ts.PropertyDeclaration => {
  return ts.createProperty(
    undefined,
    [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
    name,
    isExclamation ? ts.createToken(ts.SyntaxKind.ExclamationToken) : undefined,
    type,
    inizializer
  )
}

const getMethod = (
  name: string,
  typeParameters: Array<ts.TypeParameterDeclaration>,
  parameters: Array<ts.ParameterDeclaration>,
  returnType: ts.TypeNode,
  body: ts.Block
) => {
  return ts.createMethod(undefined, undefined, undefined, name, undefined, typeParameters, parameters, returnType, body)
}

const getFoldMethod = (d: M.Data, c: M.Constructor, name: string, isEager: boolean) => {
  const returnTypeParameterName = getFoldReturnTypeParameterName(d)
  const handlerExpression = ts.createIdentifier(getFoldHandlerName(c))
  const returnExpression =
    M.isNullary(c) && isEager
      ? handlerExpression
      : ts.createCall(
          handlerExpression,
          undefined,
          c.members.map((m, position) => {
            return ts.createPropertyAccess(ts.createThis(), getMemberName(m, position))
          })
        )
  const fold = getMethod(
    name,
    [ts.createTypeParameterDeclaration(returnTypeParameterName)],
    getFoldPositionalHandlers(d, isEager, c),
    ts.createTypeReferenceNode(returnTypeParameterName, A.empty),
    ts.createBlock([ts.createReturn(returnExpression)])
  )
  return fold
}

const when = <A>(condition: boolean, f: () => Array<A>): Array<A> => {
  return condition ? f() : A.empty
}

const getDataFptsEncoding = (d: M.Data): AST<Array<ts.Node>> => {
  return new Reader(e => {
    const isSum = M.isSum(d)
    const isPolymorphic = M.isPolymorphic(d)
    const constructors = d.constructors.toArray()

    const classes = constructors.map(c => {
      const getStaticValueField = (): Array<ts.PropertyDeclaration> => {
        return [
          ts.createProperty(
            undefined,
            [ts.createModifier(ts.SyntaxKind.StaticKeyword)],
            'value',
            undefined,
            ts.createTypeReferenceNode(
              d.name,
              d.parameterDeclarations.map(_ => ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword))
            ),
            ts.createNew(ts.createIdentifier(c.name), undefined, A.empty)
          )
        ]
      }

      const getTagField = (): Array<ts.PropertyDeclaration> => {
        return [
          getPropertyDeclaration(
            e.tagName,
            ts.createLiteralTypeNode(ts.createStringLiteral(c.name)),
            ts.createStringLiteral(c.name)
          )
        ]
      }

      const getPolymorphicFields = (): Array<ts.PropertyDeclaration> => {
        const URI = getPropertyDeclaration('_URI', ts.createTypeReferenceNode('URI', A.empty), undefined, true)
        const len = getDataParametersLength(d)
        const fptsParameters = URI2HKTParametersNames.slice(0, len).map(name =>
          getPropertyDeclaration(`_${name}`, ts.createTypeReferenceNode(name, A.empty), undefined, true)
        )
        return [...fptsParameters, URI]
      }

      const isNullary = M.isNullary(c)

      const constructor = ts.createConstructor(
        undefined,
        isNullary ? [ts.createModifier(ts.SyntaxKind.PrivateKeyword)] : undefined,
        c.members.map((m, position) => getParameterDeclaration(getMemberName(m, position), getTypeNode(m.type), true)),
        ts.createBlock([])
      )

      const getFoldMethods = (): Array<ts.ClassElement> => {
        if (isEagerFoldSupported(d)) {
          return [getFoldMethod(d, c, e.foldName, true), getFoldMethod(d, c, `${e.foldName}L`, false)]
        } else {
          return [getFoldMethod(d, c, e.foldName, false)]
        }
      }

      const members: Array<ts.ClassElement> = [
        ...when(isNullary, getStaticValueField),
        ...when(isSum, getTagField),
        ...when(isPolymorphic, getPolymorphicFields),
        constructor,
        ...when(isSum, getFoldMethods)
      ]

      return ts.createClassDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        c.name,
        getDataTypeParameterDeclarations(d),
        undefined,
        members
      )
    })

    const getModuleAugmentation = (): Array<ts.Node> => {
      return [
        getDataModuleDeclaration(d),
        getConstantDeclaration('URI', ts.createStringLiteral(d.name)),
        getTypeAliasDeclaration('URI', ts.createTypeQueryNode(ts.createIdentifier('URI')))
      ]
    }

    const getTypeAlias = (): Array<ts.Node> => {
      const unionType = ts.createUnionTypeNode(
        constructors.map(c => {
          return ts.createTypeReferenceNode(c.name, getDataTypeParameterReferences(d))
        })
      )
      return [getTypeAliasDeclaration(d.name, unionType, getDataTypeParameterDeclarations(d))]
    }

    const prelude: Array<ts.Node> = [
      ...when(isPolymorphic, getModuleAugmentation),
      ...when(isSum || d.constructors.head.name !== d.name, getTypeAlias)
    ]
    return [...prelude, ...classes]
  })
}

const getDataParametersLength = (d: M.Data): number => {
  return d.parameterDeclarations.length
}

const shouldUseLiteralEncoding = (d: M.Data): AST<boolean> => {
  return new Reader(e => e.encoding === 'literal' || getDataParametersLength(d) > URI2HKTParametersNames.length)
}

export const data = (d: M.Data): AST<Array<ts.Node>> => {
  return shouldUseLiteralEncoding(d).chain(yes => (yes ? getDataLiteralEncoding(d) : getDataFptsEncoding(d)))
}

const getFirstLetterLowerCase = (name: string): string => {
  return name.substring(0, 1).toLocaleLowerCase() + name.substring(1)
}

const getConstantDeclaration = (
  name: string,
  initializer: ts.Expression,
  type?: ts.TypeReferenceNode
): ts.VariableStatement => {
  return ts.createVariableStatement(
    [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.createVariableDeclarationList([ts.createVariableDeclaration(name, type, initializer)], ts.NodeFlags.Const)
  )
}

const getFunctionDeclaration = (
  name: string,
  typeParameters: Array<ts.TypeParameterDeclaration>,
  parameters: Array<ts.ParameterDeclaration>,
  type: ts.TypeNode,
  body: ts.Block
) => {
  return ts.createFunctionDeclaration(
    undefined,
    [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    name,
    typeParameters,
    parameters,
    type,
    body
  )
}

const getParameterDeclaration = (
  name: string,
  type?: ts.TypeNode,
  isReadonly: boolean = false
): ts.ParameterDeclaration => {
  return ts.createParameter(
    undefined,
    isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : undefined,
    undefined,
    name,
    undefined,
    type,
    undefined
  )
}

const getLiteralNullaryConstructor = (c: M.Constructor, d: M.Data): AST<ts.Node> => {
  return new Reader(e => {
    const name = getFirstLetterLowerCase(c.name)
    const initializer = ts.createObjectLiteral(
      M.isSum(d) ? [ts.createPropertyAssignment(e.tagName, ts.createStringLiteral(c.name))] : []
    )
    return getConstantDeclaration(name, initializer, getDataTypeReferenceWithNever(d))
  })
}

const getLiteralConstructor = (c: M.Constructor, d: M.Data): AST<ts.Node> => {
  return new Reader(e => {
    const name = getFirstLetterLowerCase(c.name)
    const typeParameters = d.parameterDeclarations
      .filter(p => c.members.some(m => M.typeUsesTypeParameter(m.type, p.name)))
      .map(getTypeParameterDeclaration)
    const parameters = c.members.map((m, position) => {
      const name = getMemberName(m, position)
      const type = getTypeNode(m.type)
      return getParameterDeclaration(name, type)
    })
    const properties = c.members.map((m, position) => {
      const name = getMemberName(m, position)
      return ts.createShorthandPropertyAssignment(name)
    })
    const body = ts.createBlock([
      ts.createReturn(
        ts.createObjectLiteral(
          M.isSum(d)
            ? [ts.createPropertyAssignment(e.tagName, ts.createStringLiteral(c.name)), ...properties]
            : properties
        )
      )
    ])
    const type = ts.createTypeReferenceNode(
      d.name,
      d.parameterDeclarations.map(p =>
        c.members.some(m => M.typeUsesTypeParameter(m.type, p.name))
          ? ts.createTypeReferenceNode(p.name, A.empty)
          : ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
      )
    )
    return getFunctionDeclaration(name, typeParameters, parameters, type, body)
  })
}

const getConstructorsLiteralEncoding = (d: M.Data): AST<Array<ts.Node>> => {
  const constructors = d.constructors
    .toArray()
    .map(c => A.foldL(c.members, () => getLiteralNullaryConstructor(c, d), () => getLiteralConstructor(c, d)))
  return A.array.sequence(reader)(constructors)
}

const getFptsNullaryConstructor = (c: M.Constructor, d: M.Data): AST<ts.Node> => {
  return new Reader(_ => {
    const name = getFirstLetterLowerCase(c.name)
    const initializer = ts.createPropertyAccess(ts.createIdentifier(c.name), 'value')
    return getConstantDeclaration(name, initializer, getDataTypeReferenceWithNever(d))
  })
}

const getFptsConstructor = (c: M.Constructor, d: M.Data): AST<ts.Node> => {
  return new Reader(_ => {
    const name = getFirstLetterLowerCase(c.name)
    const typeParameters = d.parameterDeclarations
      .filter(p => c.members.some(m => M.typeUsesTypeParameter(m.type, p.name)))
      .map(getTypeParameterDeclaration)
    const parameters = c.members.map((m, position) => {
      const name = getMemberName(m, position)
      const type = getTypeNode(m.type)
      return getParameterDeclaration(name, type)
    })
    const body = ts.createBlock([
      ts.createReturn(
        ts.createNew(
          ts.createIdentifier(c.name),
          undefined,
          c.members.map((m, position) => {
            return ts.createIdentifier(getMemberName(m, position))
          })
        )
      )
    ])
    const type = ts.createTypeReferenceNode(
      d.name,
      d.parameterDeclarations.map(p =>
        c.members.some(m => M.typeUsesTypeParameter(m.type, p.name))
          ? ts.createTypeReferenceNode(p.name, A.empty)
          : ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
      )
    )
    return getFunctionDeclaration(name, typeParameters, parameters, type, body)
  })
}

const getConstructorsFptsEncoding = (d: M.Data): AST<Array<ts.Node>> => {
  const constructors = d.constructors
    .toArray()
    .map(c => A.foldL(c.members, () => getFptsNullaryConstructor(c, d), () => getFptsConstructor(c, d)))
  return A.array.sequence(reader)(constructors)
}

export const constructors = (d: M.Data): AST<Array<ts.Node>> => {
  return shouldUseLiteralEncoding(d).chain(yes =>
    yes ? getConstructorsLiteralEncoding(d) : getConstructorsFptsEncoding(d)
  )
}

const isEagerFoldSupported = (d: M.Data): boolean => {
  return d.constructors.toArray().some(M.isNullary)
}

const getFoldReturnTypeParameterName = (d: M.Data): string => {
  const base = 'R'
  let candidate = base
  let counter = 0
  while (d.parameterDeclarations.findIndex(({ name }) => candidate === name) !== -1) {
    candidate = base + ++counter
  }
  return candidate
}

const getFoldHandlerName = (c: M.Constructor): string => {
  return `on${c.name}`
}

const getFoldPositionalHandlers = (
  d: M.Data,
  isEager: boolean,
  usedConstructor?: M.Constructor
): Array<ts.ParameterDeclaration> => {
  const returnTypeParameterName = getFoldReturnTypeParameterName(d)
  return d.constructors.toArray().map(c => {
    const type =
      isEager && M.isNullary(c)
        ? ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
        : ts.createFunctionTypeNode(
            undefined,
            c.members.map((m, position) => getParameterDeclaration(getMemberName(m, position), getTypeNode(m.type))),
            ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
          )
    const isParameterUnused = usedConstructor !== undefined && usedConstructor !== c
    const foldHandlerName = isParameterUnused ? `_${getFoldHandlerName(c)}` : getFoldHandlerName(c)
    return getParameterDeclaration(foldHandlerName, type)
  })
}

const getFoldRecordHandlers = (d: M.Data, handlersName: string, isEager: boolean): Array<ts.ParameterDeclaration> => {
  const returnTypeParameterName = getFoldReturnTypeParameterName(d)
  const type = ts.createTypeLiteralNode(
    d.constructors.toArray().map(c => {
      const type =
        isEager && M.isNullary(c)
          ? ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
          : ts.createFunctionTypeNode(
              undefined,
              c.members.map((m, position) => getParameterDeclaration(getMemberName(m, position), getTypeNode(m.type))),
              ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
            )
      return getPropertySignature(getFoldHandlerName(c), type, false)
    })
  )
  return [getParameterDeclaration(handlersName, type)]
}

const getFoldPositionalBody = (d: M.Data, matcheeName: string, tagName: string, isEager: boolean) => {
  return ts.createBlock([
    ts.createSwitch(
      ts.createPropertyAccess(ts.createIdentifier(matcheeName), tagName),
      ts.createCaseBlock(
        d.constructors.toArray().map(c => {
          const access = ts.createIdentifier(getFoldHandlerName(c))
          return ts.createCaseClause(ts.createStringLiteral(c.name), [
            ts.createReturn(
              isEager && M.isNullary(c)
                ? access
                : ts.createCall(
                    access,
                    A.empty,
                    c.members.map((m, position) => {
                      return ts.createPropertyAccess(ts.createIdentifier(matcheeName), getMemberName(m, position))
                    })
                  )
            )
          ])
        })
      )
    )
  ])
}

const getFoldRecordBody = (d: M.Data, matcheeName: string, tagName: string, handlersName: string, isEager: boolean) => {
  return ts.createBlock([
    ts.createSwitch(
      ts.createPropertyAccess(ts.createIdentifier(matcheeName), tagName),
      ts.createCaseBlock(
        d.constructors.toArray().map(c => {
          const access = ts.createPropertyAccess(ts.createIdentifier(handlersName), getFoldHandlerName(c))
          return ts.createCaseClause(ts.createStringLiteral(c.name), [
            ts.createReturn(
              isEager && M.isNullary(c)
                ? access
                : ts.createCall(
                    access,
                    A.empty,
                    c.members.map((m, position) => {
                      return ts.createPropertyAccess(ts.createIdentifier(matcheeName), getMemberName(m, position))
                    })
                  )
            )
          ])
        })
      )
    )
  ])
}

const getFold = (d: M.Data, name: string, isEager: boolean): AST<ts.FunctionDeclaration> => {
  return new Reader(e => {
    const matcheeName = e.matcheeName
    const tagName = e.tagName
    const handlersStyle = e.handlersStyle
    const returnTypeParameterName = getFoldReturnTypeParameterName(d)
    const typeParameterDeclarations = [
      ...getDataTypeParameterDeclarations(d),
      ts.createTypeParameterDeclaration(returnTypeParameterName)
    ]
    const matchee = getParameterDeclaration(matcheeName, getDataType(d))
    const handlers =
      handlersStyle.type === 'positional'
        ? getFoldPositionalHandlers(d, isEager)
        : getFoldRecordHandlers(d, handlersStyle.handlersName, isEager)
    const parameters = [matchee, ...handlers]
    const returnType = ts.createTypeReferenceNode(returnTypeParameterName, A.empty)
    const body =
      handlersStyle.type === 'positional'
        ? getFoldPositionalBody(d, matcheeName, tagName, isEager)
        : getFoldRecordBody(d, matcheeName, tagName, handlersStyle.handlersName, isEager)
    return getFunctionDeclaration(name, typeParameterDeclarations, parameters, returnType, body)
  })
}

export const folds = (d: M.Data): AST<Array<ts.FunctionDeclaration>> => {
  return ask<Options>().chain(e => {
    let folds: Array<AST<ts.FunctionDeclaration>> = A.empty
    if (e.encoding === 'literal') {
      if (M.isSum(d)) {
        if (isEagerFoldSupported(d)) {
          folds = [getFold(d, e.foldName, true), getFold(d, `${e.foldName}L`, false)]
        } else {
          folds = [getFold(d, e.foldName, false)]
        }
      }
    }
    return A.array.sequence(reader)(folds)
  })
}

const getImportDeclaration = (namedImports: Array<string>, from: string): ts.ImportDeclaration => {
  return ts.createImportDeclaration(
    A.empty,
    A.empty,
    ts.createImportClause(
      undefined,
      ts.createNamedImports(namedImports.map(name => ts.createImportSpecifier(undefined, ts.createIdentifier(name))))
    ),
    ts.createStringLiteral(from)
  )
}

const getArrowFunction = (parameters: Array<string>, body: ts.ConciseBody) => {
  return ts.createArrowFunction(
    [],
    A.empty,
    parameters.map(p => getParameterDeclaration(p)),
    undefined,
    undefined,
    body
  )
}

export const prisms = (d: M.Data): AST<Array<ts.Node>> => {
  return ask<Options>().chain(e => {
    if (!M.isSum(d)) {
      return reader.of(A.empty)
    }
    const dataType = getDataType(d)
    const type = ts.createTypeReferenceNode('Prism', [dataType, dataType])
    const getPrism = (name: string) => {
      return ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Prism'), 'fromPredicate'), A.empty, [
        getArrowFunction(
          ['s'],
          getStrictEquals(ts.createPropertyAccess(ts.createIdentifier('s'), e.tagName), ts.createStringLiteral(name))
        )
      ])
    }
    const monocleImport = getImportDeclaration(['Prism'], 'monocle-ts')
    const typeParameters: Array<ts.TypeParameterDeclaration> = getDataTypeParameterDeclarations(d)
    const constructors = d.constructors.toArray()
    if (M.isPolymorphic(d)) {
      return reader.of([
        monocleImport,
        ...constructors.map<ts.Node>(c => {
          const body = ts.createBlock([ts.createReturn(getPrism(c.name))])
          return getFunctionDeclaration(`_${getFirstLetterLowerCase(c.name)}`, typeParameters, A.empty, type, body)
        })
      ])
    }
    return reader.of([
      monocleImport,
      ...constructors.map(c => {
        return getConstantDeclaration(`_${c.name}`, getPrism(c.name), type)
      })
    ])
  })
}

export const unaryPrisms = (d: M.Data): AST<Array<ts.Node>> => {
  return ask<Options>().chain(e => {
    if (!M.isSum(d)) {
      return reader.of(A.empty)
    }

    const unaryConstructors = d.constructors.toArray().filter(c => c.members.length === 1)
    if (unaryConstructors.length === 0) {
      return reader.of(A.empty)
    }

    const getType = (m: M.Member) => {
      return ts.createTypeReferenceNode('Prism', [getDataType(d), getTypeNode(m.type)])
    }
    const getPrism = (m: M.Member, name: string) => {
      return ts.createNew(ts.createIdentifier('Prism'), undefined, [
        getArrowFunction(
          [e.matcheeName],
          ts.createConditional(
            getStrictEquals(
              ts.createPropertyAccess(ts.createIdentifier(e.matcheeName), e.tagName),
              ts.createStringLiteral(name)
            ),
            ts.createToken(ts.SyntaxKind.QuestionToken),
            ts.createCall(ts.createIdentifier('optionSome'), undefined, [
              ts.createPropertyAccess(ts.createIdentifier(e.matcheeName), getMemberName(m, 0))
            ]),
            ts.createToken(ts.SyntaxKind.ColonToken),
            ts.createIdentifier('optionNone')
          )
        ),
        getArrowFunction(
          ['value'],
          ts.createCall(ts.createIdentifier(`${getFirstLetterLowerCase(name)}`), undefined, [
            ts.createIdentifier('value')
          ])
        )
      ])
    }
    const optionConstructorsImport = ts.createImportDeclaration(
      A.empty,
      A.empty,
      ts.createImportClause(
        undefined,
        ts.createNamedImports([
          ts.createImportSpecifier(ts.createIdentifier('some'), ts.createIdentifier('optionSome')),
          ts.createImportSpecifier(ts.createIdentifier('none'), ts.createIdentifier('optionNone'))
        ])
      ),
      ts.createStringLiteral('fp-ts/lib/Option')
    )
    if (M.isPolymorphic(d)) {
      const typeParameters: Array<ts.TypeParameterDeclaration> = getDataTypeParameterDeclarations(d)
      return reader.of([
        optionConstructorsImport,
        ...unaryConstructors.map<ts.Node>(c => {
          const m = c.members[0]
          const body = ts.createBlock([ts.createReturn(getPrism(m, c.name))])
          return getFunctionDeclaration(`get${c.name}Prism`, typeParameters, A.empty, getType(m), body)
        })
      ])
    }
    return reader.of([
      optionConstructorsImport,
      ...unaryConstructors.map(c => {
        const m = c.members[0]
        return getConstantDeclaration(`${getFirstLetterLowerCase(c.name)}Prism`, getPrism(m, c.name), getType(m))
      })
    ])
  })
}

const getStrictEquals = (left: ts.Expression, right: ts.Expression): ts.BinaryExpression => {
  return ts.createBinary(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right)
}
