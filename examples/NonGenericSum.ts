export type NonGenericSum = {
    readonly type: "Left";
    readonly value0: string;
} | {
    readonly type: "Right";
    readonly value0: number;
} | {
    readonly type: "Nullary";
};

export function left(value0: string): NonGenericSum { return { type: "Left", value0 }; }

export function right(value0: number): NonGenericSum { return { type: "Right", value0 }; }

export const nullary: NonGenericSum = { type: "Nullary" };

export function fold<R>(fa: NonGenericSum, onLeft: (value0: string) => R, onRight: (value0: number) => R, onNullary: R): R { switch (fa.type) {
    case "Left": return onLeft(fa.value0);
    case "Right": return onRight(fa.value0);
    case "Nullary": return onNullary;
} }

export function foldL<R>(fa: NonGenericSum, onLeft: (value0: string) => R, onRight: (value0: number) => R, onNullary: () => R): R { switch (fa.type) {
    case "Left": return onLeft(fa.value0);
    case "Right": return onRight(fa.value0);
    case "Nullary": return onNullary();
} }

import { Prism } from "monocle-ts";

export const _Left: Prism<NonGenericSum, NonGenericSum> = Prism.fromPredicate(s => s.type === "Left");

export const _Right: Prism<NonGenericSum, NonGenericSum> = Prism.fromPredicate(s => s.type === "Right");

export const _Nullary: Prism<NonGenericSum, NonGenericSum> = Prism.fromPredicate(s => s.type === "Nullary");

import { some as optionSome, none as optionNone } from "fp-ts/lib/Option";

export const leftPrism: Prism<NonGenericSum, string> = new Prism(fa => fa.type === "Left" ? optionSome(fa.value0) : optionNone, value => left(value));

export const rightPrism: Prism<NonGenericSum, number> = new Prism(fa => fa.type === "Right" ? optionSome(fa.value0) : optionNone, value => right(value));

import { Setoid, fromEquals } from "fp-ts/lib/Setoid";

export function getSetoid(setoidLeftValue0: Setoid<string>, setoidRightValue0: Setoid<number>): Setoid<NonGenericSum> { return fromEquals((x, y) => { if (x.type === "Left" && y.type === "Left") {
    return setoidLeftValue0.equals(x.value0, y.value0);
} if (x.type === "Right" && y.type === "Right") {
    return setoidRightValue0.equals(x.value0, y.value0);
} if (x.type === "Nullary" && y.type === "Nullary") {
    return true;
} return false; }); }

