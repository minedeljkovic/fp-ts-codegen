import * as ts from 'typescript';
import * as Ast from './ast';
import * as M from './model';
import { Reader } from 'fp-ts/lib/Reader';
import * as Mon from 'fp-ts/lib/Monoid';
export interface Printer<A> extends Reader<Ast.Options, A> {
}
export declare const ast: (ast: ts.Node) => string;
export declare const data: (d: M.Data) => Printer<string>;
export declare const constructors: (d: M.Data) => Printer<string[]>;
export declare const folds: (d: M.Data) => Printer<string[]>;
export declare const prisms: (d: M.Data) => Printer<string[]>;
export declare const unaryPrisms: (d: M.Data) => Printer<string[]>;
export declare const getMonoid: <A>(M: Mon.Monoid<A>) => Mon.Monoid<Printer<A>>;
export declare const all: (d: M.Data) => Printer<string[]>;
export declare const print: (d: M.Data, options: Ast.Options) => string;
