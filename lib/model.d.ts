import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Option } from 'fp-ts/lib/Option';
export declare type Identifier = string;
interface Ref {
    readonly kind: 'Ref';
    readonly name: Identifier;
    readonly parameters: Array<Type>;
}
interface Tuple {
    readonly kind: 'Tuple';
    readonly types: Array<Type>;
}
interface Fun {
    readonly kind: 'Fun';
    readonly domain: Type;
    readonly codomain: Type;
}
interface Unit {
    readonly kind: 'Unit';
}
export declare type Type = Ref | Tuple | Fun | Unit;
export interface Member {
    readonly type: Type;
    readonly name: Option<Identifier>;
}
export interface Constructor {
    readonly name: Identifier;
    readonly members: Array<Member>;
}
export interface ParameterDeclaration {
    readonly name: Identifier;
    readonly constraint: Option<Type>;
}
export interface Data {
    readonly name: Identifier;
    readonly parameterDeclarations: Array<ParameterDeclaration>;
    readonly constructors: NonEmptyArray<Constructor>;
}
export declare const ref: (name: string, parameters?: Type[]) => Type;
export declare const tuple: (types: Type[]) => Type;
export declare const unit: Type;
export declare const fun: (domain: Type, codomain: Type) => Type;
export declare const member: (type: Type, name?: Option<string>) => Member;
export declare const constructor: (name: string, members?: Member[]) => Constructor;
export declare const parameterDeclaration: (name: string, constraint?: Option<Type>) => ParameterDeclaration;
export declare const data: (name: string, parameterDeclarations: ParameterDeclaration[], head: Constructor, tail?: Constructor[]) => Data;
export declare const isNullary: (c: Constructor) => boolean;
export declare const isPolymorphic: (d: Data) => boolean;
export declare const isSum: (d: Data) => boolean;
export declare const isEnum: (d: Data) => boolean;
export declare const typeUsesTypeParameter: (t: Type, id: string) => boolean;
export {};
