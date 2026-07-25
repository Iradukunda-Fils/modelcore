import { type errorObject } from "../index.js";
export declare class ModelCoreError extends Error {
    source: string | Function | undefined;
    path: Array<string | number>;
    expected: any;
    received: any;
    code: string | undefined;
    static errorName: string;
    constructor(errObj: errorObject);
}
export declare class ImmutableObjectError extends ModelCoreError {
    static errorName: string;
}
export declare class ImmutablePropertyError extends ModelCoreError {
    static errorName: string;
}
export declare class ValidationError extends ModelCoreError {
    static errorName: string;
}
export declare class EnumValueError extends ModelCoreError {
    static errorName: string;
}
export declare class RangeError extends ModelCoreError {
    static errorName: string;
}
export declare class TypeValidationError extends ModelCoreError {
    static errorName: string;
}
export declare class MissingPropertyError extends ModelCoreError {
    static errorName: string;
}
export declare class SchemaDefinitionError extends ModelCoreError {
    static errorName: string;
}
export declare class RequiredError extends ModelCoreError {
    static errorName: string;
}
export declare class ValueError extends ModelCoreError {
    static errorName: string;
}
export declare function parsePath(path: string | undefined): Array<string | number>;
