import * as P from 'parser-ts';
import * as M from './model';
import { Either } from 'fp-ts/lib/Either';
export declare const identifier: P.Parser<string>;
export declare const ref: P.Parser<M.Type>;
export declare const tuple: P.Parser<M.Type>;
export declare const fun: P.Parser<M.Type>;
export declare const type: P.Parser<M.Type>;
export declare const types: P.Parser<Array<M.Type>>;
export declare const constructor: P.Parser<M.Constructor>;
export declare const parameterDeclaration: P.Parser<M.ParameterDeclaration>;
export declare const data: P.Parser<M.Data>;
export declare const parse: (s: string) => Either<string, M.Data>;
