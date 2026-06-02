export interface FieldConfig {
    type: any;
    immutable?: boolean;
    optional?: boolean;
    default?: any;
    enum?: any[];
    max?: number;
    min?: number;
    beforeChecks?: (value: any) => any;
    afterChecks?: (value: any) => any;
    validate?: (value: any) => void;
    keys?: Record<string, FieldConfig>;
    values?: FieldConfig;
    coerce?: boolean;
}
export interface SchemaDefinition {
    [key: string]: FieldConfig;
}
export interface parserConfig {
    safe?: boolean;
}
export interface BaseConstructor {
    schema: SchemaDefinition;
    immutable?: boolean;
    version?: number;
}
export interface errorObject {
    message: string;
    source?: string | Function;
    path?: string;
    expected?: any;
    received?: any;
    code?: string;
}
export declare class ModelCoreError extends Error {
    source: string | Function | undefined;
    path: Array<string | number> | string | undefined;
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
type UnwrapTypeConstructor<T> = T extends StringConstructor ? string : T extends NumberConstructor ? number : T extends BooleanConstructor ? boolean : T extends DateConstructor ? Date : T extends ArrayConstructor ? any[] : T extends ObjectConstructor ? Record<string, any> : T extends new (...args: any[]) => infer R ? R : unknown;
type InferFieldRaw<T extends FieldConfig> = T['keys'] extends Record<string, FieldConfig> ? InferObject<T> : T['values'] extends FieldConfig ? InferArray<T> : UnwrapTypeConstructor<T['type']>;
type InferField<T extends FieldConfig> = T['optional'] extends true ? InferFieldRaw<T> | undefined : InferFieldRaw<T>;
type OptionalKeys<T extends Record<string, FieldConfig>> = {
    [K in keyof T]: T[K]['optional'] extends true ? K : never;
}[keyof T];
type RequiredKeys<T extends Record<string, FieldConfig>> = {
    [K in keyof T]: T[K]['optional'] extends true ? never : K;
}[keyof T];
type InferObject<T extends FieldConfig> = T['keys'] extends Record<string, FieldConfig> ? {
    [K in RequiredKeys<T['keys']>]: InferFieldRaw<T['keys'][K]>;
} & {
    [K in OptionalKeys<T['keys']>]?: InferFieldRaw<T['keys'][K]>;
} : Record<string, any>;
type InferArray<T extends FieldConfig> = T['values'] extends FieldConfig ? Array<InferField<T['values']>> : any[];
type SchemaToType<S extends SchemaDefinition> = {
    [K in RequiredKeys<S>]: InferFieldRaw<S[K]>;
} & {
    [K in OptionalKeys<S>]?: InferFieldRaw<S[K]>;
};
export default class Base {
    static schema: SchemaDefinition;
    static version?: number;
    static immutable?: boolean;
    version?: number | undefined;
    [key: string]: any;
    constructor(obj: Record<string, any>, parseConfig?: parserConfig);
    static createFrom<T extends typeof Base>(this: T, obj: SchemaToType<T['schema']>, parseConfig?: parserConfig): SchemaToType<T['schema']>;
    update(obj: Record<string, any>, parseConfig?: parserConfig, isNew?: boolean): void;
    toObject(): Record<string, any>;
    json(): string;
    private setProperties;
    private runValidate;
    private validateType;
}
export {};
