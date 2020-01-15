export type User = {
    readonly name: string;
    readonly surname: string;
    readonly age: number;
};

export function user(name: string, surname: string, age: number): User { return { name, surname, age }; }

