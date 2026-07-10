export interface FieldConfig {
    type: any;
    immutable?: boolean;
    optional?: boolean;
    required?: boolean;
    default?: any;
    enum?: any[];
    max?: number;
    min?: number;
    beforeChecks?: (value: any) => any;
    afterChecks?: (value: any) => any;
    validate?: (value: any) => void;
    keys?: Record<string, FieldConfig | Function>;
    properties?: Record<string, FieldConfig | Function>;
    values?: FieldConfig | Function;
    coerce?: boolean;
    [key: string]: any;
}
export interface SchemaDefinition {
    [key: string]: Function | FieldConfig;
}
export interface parserConfig {
    safe?: boolean;
}
export interface BaseConstructor {
    schema: SchemaDefinition;
    immutable?: boolean;
    version?: number;
    __proxyHandler?: ProxyHandler<any>;
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
export declare function Union<T extends readonly (abstract new (...args: any) => any)[]>(...args: T): {
    new (): InstanceType<T[number]>;
    unionTypes: T;
    isArray(arg: any): arg is any[];
    from<T_1>(arrayLike: ArrayLike<T_1>): T_1[];
    from<T_1, U>(arrayLike: ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
    from<T_1>(iterable: Iterable<T_1> | ArrayLike<T_1>): T_1[];
    from<T_1, U>(iterable: Iterable<T_1> | ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
    of<T_1>(...items: T_1[]): T_1[];
    readonly [Symbol.species]: ArrayConstructor;
};
type UnwrapTypeConstructor<T> = T extends StringConstructor ? string : T extends NumberConstructor ? number : T extends BooleanConstructor ? boolean : T extends DateConstructor ? Date : T extends ArrayConstructor ? any[] : T extends ObjectConstructor ? Record<string, any> : T extends new (...args: any[]) => infer R ? R : unknown;
type NormalizeField<T> = T extends FieldConfig ? T : {
    type: T;
};
type InferFieldRaw<T> = NormalizeField<T> extends infer F extends FieldConfig ? F['type'] extends {
    unionTypes: readonly any[];
} ? InstanceType<F['type']['unionTypes'][number]> : F['type'] extends ObjectConstructor ? InferObject<F> : F['type'] extends ArrayConstructor ? InferArray<F> : UnwrapTypeConstructor<F['type']> : any;
type OptionalKeys<T extends Record<string, any>> = {
    [K in keyof T]: NormalizeField<T[K]>['optional'] extends true ? K : NormalizeField<T[K]>['required'] extends false ? K : never;
}[keyof T];
type RequiredKeys<T extends Record<string, any>> = {
    [K in keyof T]: NormalizeField<T[K]>['optional'] extends true ? never : NormalizeField<T[K]>['required'] extends false ? never : K;
}[keyof T];
type InferObject<T extends FieldConfig> = T['keys'] extends Record<string, any> ? {
    [K in RequiredKeys<T['keys']>]: InferFieldRaw<T['keys'][K]>;
} & {
    [K in OptionalKeys<T['keys']>]?: InferFieldRaw<T['keys'][K]>;
} : Record<string, any>;
type InferArray<T extends FieldConfig> = T['type'] extends ArrayConstructor ? Array<InferFieldRaw<T['values']>> : any[];
export type SchemaToType<S extends Record<string, any>> = {
    [K in RequiredKeys<S>]: InferFieldRaw<S[K]>;
} & {
    [K in OptionalKeys<S>]?: InferFieldRaw<S[K]>;
};
export declare function buildError(errorType: new (errObj: errorObject) => ModelCoreError, message: string, source?: string | Function, path?: string, expected?: any, received?: any, code?: string): ModelCoreError;
export default class Base {
    static schema: SchemaDefinition;
    static version?: number;
    static immutable?: boolean;
    static validationHandlers: Array<Function>;
    [key: string]: any;
    constructor(obj: Record<string, any>, parseConfig?: parserConfig);
    static addValidationHandler(handler: Function): void;
    static createFrom<T extends typeof Base>(this: T, obj: SchemaToType<T['schema']>, parseConfig?: parserConfig): SchemaToType<T['schema']>;
    static create<T extends typeof Base>(this: T, obj: SchemaToType<T['schema']>, parseConfig?: parserConfig): SchemaToType<T['schema']>;
    update(obj: Record<string, any>, parseConfig?: parserConfig, isNew?: boolean): void;
    toObject(): Record<string, any>;
    json(): string;
    private setProperties;
    runValidate(confPassed: FieldConfig | Function, valuePassed: any, path: string, isNew: boolean): any;
    private validateType;
}
export {};
