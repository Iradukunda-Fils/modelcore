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
    new (): {
        [n: number]: any;
        keys(): ArrayIterator<number>;
        length: number;
        toString(): string;
        toLocaleString(): string;
        toLocaleString(locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
        pop(): any;
        push(...items: any[]): number;
        concat(...items: ConcatArray<any>[]): any[];
        concat(...items: any[]): any[];
        join(separator?: string): string;
        reverse(): any[];
        shift(): any;
        slice(start?: number, end?: number): any[];
        sort(compareFn?: ((a: any, b: any) => number) | undefined): /*elided*/ any;
        splice(start: number, deleteCount?: number): any[];
        splice(start: number, deleteCount: number, ...items: any[]): any[];
        unshift(...items: any[]): number;
        indexOf(searchElement: any, fromIndex?: number): number;
        lastIndexOf(searchElement: any, fromIndex?: number): number;
        every<S extends any>(predicate: (value: any, index: number, array: any[]) => value is S, thisArg?: any): this is S[];
        every(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): boolean;
        some(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): boolean;
        forEach(callbackfn: (value: any, index: number, array: any[]) => void, thisArg?: any): void;
        map<U>(callbackfn: (value: any, index: number, array: any[]) => U, thisArg?: any): U[];
        filter<S extends any>(predicate: (value: any, index: number, array: any[]) => value is S, thisArg?: any): S[];
        filter(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): any[];
        reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any): any;
        reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any, initialValue: any): any;
        reduce<U>(callbackfn: (previousValue: U, currentValue: any, currentIndex: number, array: any[]) => U, initialValue: U): U;
        reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any): any;
        reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any, initialValue: any): any;
        reduceRight<U>(callbackfn: (previousValue: U, currentValue: any, currentIndex: number, array: any[]) => U, initialValue: U): U;
        find<S extends any>(predicate: (value: any, index: number, obj: any[]) => value is S, thisArg?: any): S | undefined;
        find(predicate: (value: any, index: number, obj: any[]) => unknown, thisArg?: any): any;
        findIndex(predicate: (value: any, index: number, obj: any[]) => unknown, thisArg?: any): number;
        fill(value: any, start?: number, end?: number): /*elided*/ any;
        copyWithin(target: number, start: number, end?: number): /*elided*/ any;
        [Symbol.iterator](): ArrayIterator<any>;
        entries(): ArrayIterator<[number, any]>;
        values(): ArrayIterator<any>;
        readonly [Symbol.unscopables]: {
            [x: number]: boolean | undefined;
            length?: boolean | undefined;
            toString?: boolean | undefined;
            toLocaleString?: boolean | undefined;
            pop?: boolean | undefined;
            push?: boolean | undefined;
            concat?: boolean | undefined;
            join?: boolean | undefined;
            reverse?: boolean | undefined;
            shift?: boolean | undefined;
            slice?: boolean | undefined;
            sort?: boolean | undefined;
            splice?: boolean | undefined;
            unshift?: boolean | undefined;
            indexOf?: boolean | undefined;
            lastIndexOf?: boolean | undefined;
            every?: boolean | undefined;
            some?: boolean | undefined;
            forEach?: boolean | undefined;
            map?: boolean | undefined;
            filter?: boolean | undefined;
            reduce?: boolean | undefined;
            reduceRight?: boolean | undefined;
            find?: boolean | undefined;
            findIndex?: boolean | undefined;
            fill?: boolean | undefined;
            copyWithin?: boolean | undefined;
            [Symbol.iterator]?: boolean | undefined;
            entries?: boolean | undefined;
            keys?: boolean | undefined;
            values?: boolean | undefined;
            readonly [Symbol.unscopables]?: boolean | undefined;
            includes?: boolean | undefined;
            flatMap?: boolean | undefined;
            flat?: boolean | undefined;
        };
        includes(searchElement: any, fromIndex?: number): boolean;
        flatMap<U, This = undefined>(callback: (this: This, value: any, index: number, array: any[]) => U | readonly U[], thisArg?: This | undefined): U[];
        flat<A, D extends number = 1>(this: A, depth?: D | undefined): FlatArray<A, D>[];
    };
    unionTypes: T;
    isArray(arg: any): arg is any[];
    from<T_1>(arrayLike: ArrayLike<T_1>): T_1[];
    from<T_1, U>(arrayLike: ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
    from<T_1>(iterable: Iterable<T_1> | ArrayLike<T_1>): T_1[];
    from<T_1, U>(iterable: Iterable<T_1> | ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
    of<T_1>(...items: T_1[]): T_1[];
    readonly [Symbol.species]: ArrayConstructor;
};
type UnwrapTypeConstructor<T> = T extends {
    unionTypes: readonly any[];
} ? InstanceType<T['unionTypes'][number]> : T extends StringConstructor ? string : T extends NumberConstructor ? number : T extends BooleanConstructor ? boolean : T extends DateConstructor ? Date : T extends SetConstructor ? Set<any> : T extends MapConstructor ? Map<any, any> : T extends ArrayConstructor ? any[] : T extends ObjectConstructor ? Record<string, any> : T extends new (...args: any[]) => infer R ? R : unknown;
type NormalizeField<T> = T extends FieldConfig ? T : {
    type: T;
};
type InferFieldConfigRaw<F extends FieldConfig> = F['type'] extends typeof Set ? InferSet<F> : F['type'] extends typeof Map ? InferMap<F> : F['type'] extends typeof Object ? InferObject<F> : F['type'] extends typeof Array ? InferArray<F> : UnwrapTypeConstructor<F['type']>;
type InferFieldRaw<T> = T extends FieldConfig ? InferFieldConfigRaw<T> : T extends Function ? UnwrapTypeConstructor<T> : InferFieldConfigRaw<{
    type: T;
} & FieldConfig>;
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
} : T['properties'] extends Record<string, any> ? {
    [K in RequiredKeys<T['properties']>]: InferFieldRaw<T['properties'][K]>;
} & {
    [K in OptionalKeys<T['properties']>]?: InferFieldRaw<T['properties'][K]>;
} : Record<string, T['keys']>;
type InferMap<T extends FieldConfig> = T['keys'] extends Record<string, any> ? Map<string, InferFieldRaw<T['keys'][keyof T['keys']]>> : T['properties'] extends Record<string, any> ? Map<string, InferFieldRaw<T['properties'][keyof T['properties']]>> : Map<string, T['keys']>;
type InferArray<T extends FieldConfig> = T['type'] extends ArrayConstructor ? Array<InferFieldRaw<T['values']>> : any[];
type InferSet<T extends FieldConfig> = T['type'] extends SetConstructor ? Set<InferFieldRaw<T['values']>> : Set<any>;
export type SchemaToType<S extends Record<string, any>> = {
    [K in RequiredKeys<S>]: InferFieldRaw<S[K]>;
} & {
    [K in OptionalKeys<S>]?: InferFieldRaw<S[K]>;
};
export declare function buildError(errorType: new (errObj: errorObject) => ModelCoreError, message: string, source?: string | Function, path?: string, expected?: any, received?: any, code?: string): ModelCoreError;
export default class Base {
    static schema: SchemaDefinition;
    static immutable?: boolean;
    static validationHandlers: Map<string, Function>;
    static autorequire?: boolean;
    [key: string]: any;
    constructor(obj: Record<string, any>, parseConfig?: parserConfig);
    static addValidationHandler(handlerName: string, handler: Function): void;
    static removeValidationHandler(handlerName: string): void;
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
