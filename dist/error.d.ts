/// <reference types="node" />
export declare function instanceOfNodeError<T extends new (...args: any) => Error>(value: unknown | Error, errorType: T): value is InstanceType<T> & NodeJS.ErrnoException;
