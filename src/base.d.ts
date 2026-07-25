import { type SchemaDefinition, type FieldConfig, type parserConfig, type SchemaToType } from "../index.js";
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
