export type These<A, B> = {
    readonly type: "Left";
    readonly left: A;
} | {
    readonly type: "Right";
    readonly right: B;
} | {
    readonly type: "Both";
    readonly left: A;
    readonly right: B;
};

export function left<A>(left: A): These<A, never> { return { type: "Left", left }; }

export function right<B>(right: B): These<never, B> { return { type: "Right", right }; }

export function both<A, B>(left: A, right: B): These<A, B> { return { type: "Both", left, right }; }

export function fold<A, B, R>(fa: These<A, B>, onLeft: (left: A) => R, onRight: (right: B) => R, onBoth: (left: A, right: B) => R): R { switch (fa.type) {
    case "Left": return onLeft(fa.left);
    case "Right": return onRight(fa.right);
    case "Both": return onBoth(fa.left, fa.right);
} }

import { Prism } from "monocle-ts";

export function _left<A, B>(): Prism<These<A, B>, These<A, B>> { return Prism.fromPredicate(s => s.type === "Left"); }

export function _right<A, B>(): Prism<These<A, B>, These<A, B>> { return Prism.fromPredicate(s => s.type === "Right"); }

export function _both<A, B>(): Prism<These<A, B>, These<A, B>> { return Prism.fromPredicate(s => s.type === "Both"); }

import { some as optionSome, none as optionNone } from "fp-ts/lib/Option";

export function getLeftPrism<A, B>(): Prism<These<A, B>, A> { return new Prism(fa => fa.type === "Left" ? optionSome(fa.left) : optionNone, value => left(value)); }

export function getRightPrism<A, B>(): Prism<These<A, B>, B> { return new Prism(fa => fa.type === "Right" ? optionSome(fa.right) : optionNone, value => right(value)); }

