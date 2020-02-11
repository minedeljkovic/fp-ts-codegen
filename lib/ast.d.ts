import { Reader } from 'fp-ts/lib/Reader';
import * as ts from 'typescript';
import * as M from './model';
import { Lens } from 'monocle-ts';
export interface Options {
    /** the name of the field used as tag */
    tagName: string;
    /** the name prefix used for pattern matching functions */
    foldName: string;
    /** the name used for the input of pattern matching functions */
    matcheeName: string;
    /**
     * the pattern matching handlers can be expressed as positional arguments
     * or a single object literal `tag -> handler`
     */
    handlersStyle: {
        type: 'positional';
    } | {
        type: 'record';
        handlersName: string;
    };
    encoding: 'literal' | 'fp-ts';
}
export declare const defaultOptions: Options;
export declare const lenses: {
    [K in keyof Options]: Lens<Options, Options[K]>;
};
export interface AST<A> extends Reader<Options, A> {
}
export declare const data: (d: M.Data) => AST<ts.Node[]>;
export declare const constructors: (d: M.Data) => AST<ts.Node[]>;
export declare const folds: (d: M.Data) => AST<ts.FunctionDeclaration[]>;
export declare const prisms: (d: M.Data) => AST<ts.Node[]>;
export declare const unaryPrisms: (d: M.Data) => AST<ts.Node[]>;
