import { Either } from 'fp-ts/lib/Either';
import { Options } from './ast';
export declare function run(input: string, options?: Options): Either<string, string>;
