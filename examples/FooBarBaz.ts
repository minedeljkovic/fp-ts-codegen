export type FooBarBaz = {
    readonly type: "Foo";
} | {
    readonly type: "Bar";
} | {
    readonly type: "Baz";
};

export const foo: FooBarBaz = { type: "Foo" };

export const bar: FooBarBaz = { type: "Bar" };

export const baz: FooBarBaz = { type: "Baz" };

export function fold<R>(fa: FooBarBaz, onFoo: R, onBar: R, onBaz: R): R { switch (fa.type) {
    case "Foo": return onFoo;
    case "Bar": return onBar;
    case "Baz": return onBaz;
} }

export function foldL<R>(fa: FooBarBaz, onFoo: () => R, onBar: () => R, onBaz: () => R): R { switch (fa.type) {
    case "Foo": return onFoo();
    case "Bar": return onBar();
    case "Baz": return onBaz();
} }

import { Prism } from "monocle-ts";

export const _Foo: Prism<FooBarBaz, FooBarBaz> = Prism.fromPredicate(s => s.type === "Foo");

export const _Bar: Prism<FooBarBaz, FooBarBaz> = Prism.fromPredicate(s => s.type === "Bar");

export const _Baz: Prism<FooBarBaz, FooBarBaz> = Prism.fromPredicate(s => s.type === "Baz");

