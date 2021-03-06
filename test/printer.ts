import * as assert from 'assert'
import * as M from '../src/model'
import * as P from '../src/printer'
import * as E from './examples'
import { assertPrinterEqual } from './helpers'
import { defaultOptions, lenses } from '../src/ast'

describe('printer', () => {
  describe('literal encoding', () => {
    describe('data', () => {
      it('positional fields', () => {
        assertPrinterEqual(
          P.data,
          E.Option,
          `export type Option<A> = {
    readonly type: "None";
} | {
    readonly type: "Some";
    readonly value0: A;
};`
        )
        assertPrinterEqual(
          P.data,
          E.Either,
          `export type Either<L, R> = {
    readonly type: "Left";
    readonly value0: L;
} | {
    readonly type: "Right";
    readonly value0: R;
};`
        )
        assertPrinterEqual(
          P.data,
          E.Tree,
          `export type Tree<A> = {
    readonly type: "Leaf";
} | {
    readonly type: "Node";
    readonly value0: Tree<A>;
    readonly value1: A;
    readonly value2: Tree<A>;
};`
        )
      })

      it('record fields', () => {
        assertPrinterEqual(
          P.data,
          E.Maybe,
          `export type Maybe<A> = {
    readonly type: "Nothing";
} | {
    readonly type: "Just";
    readonly value: A;
};`
        )
      })

      it('constrained data', () => {
        assertPrinterEqual(
          P.data,
          E.Constrained,
          `export type Constrained<A extends string> = {
    readonly type: "Fetching";
} | {
    readonly type: "GotData";
    readonly value0: A;
};`
        )
      })

      it('tuple domain', () => {
        const data = M.data(
          'Tuple',
          [],
          M.constructor('Tuple', [M.member(M.fun(M.tuple([M.ref('A'), M.ref('B')]), M.ref('C')))])
        )
        assertPrinterEqual(
          P.data,
          data,
          `export type Tuple = {
    readonly value0: (tuple: [A, B]) => C;
};`
        )
      })

      it('function domain', () => {
        const data = M.data(
          'Function',
          [],
          M.constructor('Function', [M.member(M.fun(M.fun(M.ref('A'), M.ref('B')), M.ref('C')))])
        )
        assertPrinterEqual(
          P.data,
          data,
          `export type Function = {
    readonly value0: (f: (a: A) => B) => C;
};`
        )
      })

      it('tuple field', () => {
        assertPrinterEqual(
          P.data,
          E.Tuple2,
          `export type Tuple2<A, B> = {
    readonly value0: [A, B];
};`
        )
      })

      it('unit field', () => {
        const data = M.data('Unit', [], M.constructor('Unit', [M.member(M.unit)]))
        assertPrinterEqual(
          P.data,
          data,
          `export type Unit = {
    readonly value0: undefined;
};`
        )
      })

      it('function fields', () => {
        assertPrinterEqual(
          P.data,
          E.Writer,
          `export type Writer<W, A> = {
    readonly value0: () => [A, W];
};`
        )
        assertPrinterEqual(
          P.data,
          E.State,
          `export type State<S, A> = {
    readonly value0: (s: S) => [A, S];
};`
        )
      })

      it('should handle only one constructor', () => {
        assertPrinterEqual(
          P.data,
          E.User,
          `export type User = {
    readonly name: string;
    readonly surname: string;
    readonly age: number;
};`
        )
      })

      it('should handle nullary constructors', () => {
        assertPrinterEqual(
          P.data,
          E.FooBarBaz,
          `export type FooBarBaz = {
    readonly type: "Foo";
} | {
    readonly type: "Bar";
} | {
    readonly type: "Baz";
};`
        )
      })
    })

    describe('constructors', () => {
      it('positional fields', () => {
        assertPrinterEqual(P.constructors, E.Option, [
          'export const none: Option<never> = { type: "None" };',
          'export function some<A>(value0: A): Option<A> { return { type: "Some", value0 }; }'
        ])
        assertPrinterEqual(P.constructors, E.Either, [
          'export function left<L>(value0: L): Either<L, never> { return { type: "Left", value0 }; }',
          'export function right<R>(value0: R): Either<never, R> { return { type: "Right", value0 }; }'
        ])
        assertPrinterEqual(P.constructors, E.Tree, [
          'export const leaf: Tree<never> = { type: "Leaf" };',
          'export function node<A>(value0: Tree<A>, value1: A, value2: Tree<A>): Tree<A> { return { type: "Node", value0, value1, value2 }; }'
        ])
        assertPrinterEqual(P.constructors, E.Writer, [
          'export function writer<W, A>(value0: () => [A, W]): Writer<W, A> { return { value0 }; }'
        ])
      })

      it('record fields', () => {
        assertPrinterEqual(P.constructors, E.Maybe, [
          'export const nothing: Maybe<never> = { type: "Nothing" };',
          'export function just<A>(value: A): Maybe<A> { return { type: "Just", value }; }'
        ])
      })

      it('nullary constructors', () => {
        assertPrinterEqual(P.constructors, E.FooBarBaz, [
          'export const foo: FooBarBaz = { type: "Foo" };',
          'export const bar: FooBarBaz = { type: "Bar" };',
          'export const baz: FooBarBaz = { type: "Baz" };'
        ])
      })

      it('monomorphic constructors', () => {
        assertPrinterEqual(P.constructors, E.User, [
          'export function user(name: string, surname: string, age: number): User { return { name, surname, age }; }'
        ])
      })

      it('monomorphic nullary constructor', () => {
        assertPrinterEqual(P.constructors, E.Nullary, ['export const nullary: Nullary = {};'])
      })
    })
  })

  const fptsEncodingOptions = lenses.encoding.set('fp-ts')(defaultOptions)

  describe('fp-ts encoding', () => {
    describe('data', () => {
      it('not a sum type', () => {
        assertPrinterEqual(
          P.data,
          E.User,
          `export class User {
    constructor(readonly name: string, readonly surname: string, readonly age: number) { }
}`,
          fptsEncodingOptions
        )
      })

      it('not aligned names', () => {
        assertPrinterEqual(
          P.data,
          E.NotAlignedNames,
          `export type NotAlignedNames = Ctor;

export class Ctor {
    constructor(readonly value: string) { }
}`,
          fptsEncodingOptions
        )
      })

      it('eager fold not supported', () => {
        assertPrinterEqual(
          P.data,
          E.Either,
          `declare module "fp-ts/lib/HKT" {
    interface URI2HKT2<L, A> {
        Either: Either<L, A>;
    }
}

export const URI = "Either";

export type URI = typeof URI;

export type Either<L, R> = Left<L, R> | Right<L, R>;

export class Left<L, R> {
    readonly type: "Left" = "Left";
    readonly _A!: A;
    readonly _L!: L;
    readonly _URI!: URI;
    constructor(readonly value0: L) { }
    fold<R1>(onLeft: (value0: L) => R1, _onRight: (value0: R) => R1): R1 { return onLeft(this.value0); }
}

export class Right<L, R> {
    readonly type: "Right" = "Right";
    readonly _A!: A;
    readonly _L!: L;
    readonly _URI!: URI;
    constructor(readonly value0: R) { }
    fold<R1>(_onLeft: (value0: L) => R1, onRight: (value0: R) => R1): R1 { return onRight(this.value0); }
}`,
          fptsEncodingOptions
        )
      })

      it('unconstrained data', () => {
        assertPrinterEqual(
          P.data,
          E.Option,
          `declare module "fp-ts/lib/HKT" {
    interface URI2HKT<A> {
        Option: Option<A>;
    }
}

export const URI = "Option";

export type URI = typeof URI;

export type Option<A> = None<A> | Some<A>;

export class None<A> {
    static value: Option<never> = new None();
    readonly type: "None" = "None";
    readonly _A!: A;
    readonly _URI!: URI;
    private constructor() { }
    fold<R>(onNone: R, _onSome: (value0: A) => R): R { return onNone; }
    foldL<R>(onNone: () => R, _onSome: (value0: A) => R): R { return onNone(); }
}

export class Some<A> {
    readonly type: "Some" = "Some";
    readonly _A!: A;
    readonly _URI!: URI;
    constructor(readonly value0: A) { }
    fold<R>(_onNone: R, onSome: (value0: A) => R): R { return onSome(this.value0); }
    foldL<R>(_onNone: () => R, onSome: (value0: A) => R): R { return onSome(this.value0); }
}`,
          fptsEncodingOptions
        )
      })

      it('constrained data', () => {
        assertPrinterEqual(
          P.data,
          E.Constrained,
          `declare module "fp-ts/lib/HKT" {
    interface URI2HKT<A> {
        Constrained: Constrained<A>;
    }
}

export const URI = "Constrained";

export type URI = typeof URI;

export type Constrained<A extends string> = Fetching<A> | GotData<A>;

export class Fetching<A extends string> {
    static value: Constrained<never> = new Fetching();
    readonly type: "Fetching" = "Fetching";
    readonly _A!: A;
    readonly _URI!: URI;
    private constructor() { }
    fold<R>(onFetching: R, _onGotData: (value0: A) => R): R { return onFetching; }
    foldL<R>(onFetching: () => R, _onGotData: (value0: A) => R): R { return onFetching(); }
}

export class GotData<A extends string> {
    readonly type: "GotData" = "GotData";
    readonly _A!: A;
    readonly _URI!: URI;
    constructor(readonly value0: A) { }
    fold<R>(_onFetching: R, onGotData: (value0: A) => R): R { return onGotData(this.value0); }
    foldL<R>(_onFetching: () => R, onGotData: (value0: A) => R): R { return onGotData(this.value0); }
}`,
          fptsEncodingOptions
        )
      })
    })

    describe('constructors', () => {
      it('unconstrained data', () => {
        assertPrinterEqual(
          P.constructors,
          E.Option,
          [
            'export const none: Option<never> = None.value;',
            'export function some<A>(value0: A): Option<A> { return new Some(value0); }'
          ],
          fptsEncodingOptions
        )
        assertPrinterEqual(
          P.constructors,
          E.Either,
          [
            'export function left<L>(value0: L): Either<L, never> { return new Left(value0); }',
            'export function right<R>(value0: R): Either<never, R> { return new Right(value0); }'
          ],
          fptsEncodingOptions
        )
      })

      it('constrained data', () => {
        assertPrinterEqual(
          P.constructors,
          E.Constrained,
          [
            'export const fetching: Constrained<never> = Fetching.value;',
            'export function gotData<A extends string>(value0: A): Constrained<A> { return new GotData(value0); }'
          ],
          fptsEncodingOptions
        )
      })
    })
  })

  describe('folds', () => {
    it('positional fields', () => {
      assertPrinterEqual(P.folds, E.Option, [
        'export function fold<A, R>(fa: Option<A>, onNone: R, onSome: (value0: A) => R): R { switch (fa.type) {\n    case "None": return onNone;\n    case "Some": return onSome(fa.value0);\n} }',
        'export function foldL<A, R>(fa: Option<A>, onNone: () => R, onSome: (value0: A) => R): R { switch (fa.type) {\n    case "None": return onNone();\n    case "Some": return onSome(fa.value0);\n} }'
      ])
    })

    it('record fields', () => {
      assertPrinterEqual(P.folds, E.Maybe, [
        'export function fold<A, R>(fa: Maybe<A>, onNothing: R, onJust: (value: A) => R): R { switch (fa.type) {\n    case "Nothing": return onNothing;\n    case "Just": return onJust(fa.value);\n} }',
        'export function foldL<A, R>(fa: Maybe<A>, onNothing: () => R, onJust: (value: A) => R): R { switch (fa.type) {\n    case "Nothing": return onNothing();\n    case "Just": return onJust(fa.value);\n} }'
      ])
    })

    it('should not emit a fold if data is not a sum type', () => {
      assertPrinterEqual(P.folds, E.User, [])
    })

    it('should not emit a fold if all constructors are not nullary', () => {
      assertPrinterEqual(P.folds, E.Either, [
        'export function fold<L, R, R1>(fa: Either<L, R>, onLeft: (value0: L) => R1, onRight: (value0: R) => R1): R1 { switch (fa.type) {\n    case "Left": return onLeft(fa.value0);\n    case "Right": return onRight(fa.value0);\n} }'
      ])
    })

    it('should handle monomorphic data', () => {
      assertPrinterEqual(P.folds, E.FooBarBaz, [
        'export function fold<R>(fa: FooBarBaz, onFoo: R, onBar: R, onBaz: R): R { switch (fa.type) {\n    case "Foo": return onFoo;\n    case "Bar": return onBar;\n    case "Baz": return onBaz;\n} }',
        'export function foldL<R>(fa: FooBarBaz, onFoo: () => R, onBar: () => R, onBaz: () => R): R { switch (fa.type) {\n    case "Foo": return onFoo();\n    case "Bar": return onBar();\n    case "Baz": return onBaz();\n} }'
      ])
    })

    it('should not output any fold function when the encodig is fp-ts', () => {
      assertPrinterEqual(P.folds, E.Option, [], fptsEncodingOptions)
    })
  })

  describe('prisms', () => {
    it('should handle non sum types', () => {
      assertPrinterEqual(P.prisms, E.User, [])
    })

    it('should handle monomorphic data', () => {
      assertPrinterEqual(P.prisms, E.FooBarBaz, [
        'import { Prism } from "monocle-ts";',
        'export const _Foo: Prism<FooBarBaz, FooBarBaz> = Prism.fromPredicate(s => s.type === "Foo");',
        'export const _Bar: Prism<FooBarBaz, FooBarBaz> = Prism.fromPredicate(s => s.type === "Bar");',
        'export const _Baz: Prism<FooBarBaz, FooBarBaz> = Prism.fromPredicate(s => s.type === "Baz");'
      ])
    })
  })

  describe('unary prisms', () => {
    it('should handle non sum types', () => {
      assertPrinterEqual(P.unaryPrisms, E.User, [])
    })

    it('should handle monomorphic data', () => {
      assertPrinterEqual(P.unaryPrisms, E.FooBarBaz, [])
    })

    it('should handle non generic sums', () => {
      assertPrinterEqual(P.unaryPrisms, E.NonGenericSum, [
        'import { some as optionSome, none as optionNone } from "fp-ts/lib/Option";',
        'export const leftPrism: Prism<NonGenericSum, string> = new Prism(fa => fa.type === "Left" ? optionSome(fa.value0) : optionNone, value => left(value));',
        'export const rightPrism: Prism<NonGenericSum, number> = new Prism(fa => fa.type === "Right" ? optionSome(fa.value0) : optionNone, value => right(value));'
      ])
    })
  })

  describe('options', () => {
    it('should handle custom tag names', () => {
      const printer = P.print
      assert.strictEqual(
        printer(E.Option, lenses.tagName.set('tag')(defaultOptions)),
        `export type Option<A> = {
    readonly tag: "None";
} | {
    readonly tag: "Some";
    readonly value0: A;
};

export const none: Option<never> = { tag: "None" };

export function some<A>(value0: A): Option<A> { return { tag: "Some", value0 }; }

export function fold<A, R>(fa: Option<A>, onNone: R, onSome: (value0: A) => R): R { switch (fa.tag) {
    case "None": return onNone;
    case "Some": return onSome(fa.value0);
} }

export function foldL<A, R>(fa: Option<A>, onNone: () => R, onSome: (value0: A) => R): R { switch (fa.tag) {
    case "None": return onNone();
    case "Some": return onSome(fa.value0);
} }

import { Prism } from "monocle-ts";

export function _none<A>(): Prism<Option<A>, Option<A>> { return Prism.fromPredicate(s => s.tag === "None"); }

export function _some<A>(): Prism<Option<A>, Option<A>> { return Prism.fromPredicate(s => s.tag === "Some"); }

import { some as optionSome, none as optionNone } from "fp-ts/lib/Option";

export function getSomePrism<A>(): Prism<Option<A>, A> { return new Prism(fa => fa.tag === "Some" ? optionSome(fa.value0) : optionNone, value => some(value)); }`
      )
    })

    it('should handle custom fold names', () => {
      assertPrinterEqual(
        P.folds,
        E.Option,
        [
          `export function match<A, R>(fa: Option<A>, onNone: R, onSome: (value0: A) => R): R { switch (fa.type) {
    case "None": return onNone;
    case "Some": return onSome(fa.value0);
} }`,
          `export function matchL<A, R>(fa: Option<A>, onNone: () => R, onSome: (value0: A) => R): R { switch (fa.type) {
    case "None": return onNone();
    case "Some": return onSome(fa.value0);
} }`
        ],
        lenses.foldName.set('match')(defaultOptions)
      )
    })

    it('should handle custom matchee name', () => {
      assertPrinterEqual(
        P.folds,
        E.Option,
        [
          `export function fold<A, R>(input: Option<A>, onNone: R, onSome: (value0: A) => R): R { switch (input.type) {
    case "None": return onNone;
    case "Some": return onSome(input.value0);
} }`,
          `export function foldL<A, R>(input: Option<A>, onNone: () => R, onSome: (value0: A) => R): R { switch (input.type) {
    case "None": return onNone();
    case "Some": return onSome(input.value0);
} }`
        ],
        lenses.matcheeName.set('input')(defaultOptions)
      )
    })

    it('should handle handlersName handlersStyle', () => {
      assertPrinterEqual(
        P.folds,
        E.Option,
        [
          `export function fold<A, R>(fa: Option<A>, clauses: {
    onNone: R;
    onSome: (value0: A) => R;
}): R { switch (fa.type) {
    case "None": return clauses.onNone;
    case "Some": return clauses.onSome(fa.value0);
} }`,
          `export function foldL<A, R>(fa: Option<A>, clauses: {
    onNone: () => R;
    onSome: (value0: A) => R;
}): R { switch (fa.type) {
    case "None": return clauses.onNone();
    case "Some": return clauses.onSome(fa.value0);
} }`
        ],
        lenses.handlersStyle.set({ type: 'record', handlersName: 'clauses' })(defaultOptions)
      )
    })
  })
})
