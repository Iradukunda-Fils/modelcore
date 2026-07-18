import { Base, type FieldConfig, type BaseConstructor, type errorObject, ModelCoreError } from "../index.js";
export declare function isNone(that: any): boolean;
export declare function buildError(errorType: new (errObj: errorObject) => ModelCoreError, message: string, source?: string | Function, path?: string, expected?: any, received?: any, code?: string): ModelCoreError;
export declare function normalizeConf(conf: FieldConfig | any, path: string): FieldConfig;
export declare function createProxyHandler(ctor: typeof Base & BaseConstructor): ProxyHandler<Base>;
export declare function createArrayHandler(vd: Base, confValues: Function | FieldConfig, path: string): ProxyHandler<any[]>;
export declare function createSetHandler(vd: Base, confValues: Function | FieldConfig, path: string): ProxyHandler<Set<any>>;
export declare function createMapHandler(vd: Base, conf: FieldConfig, path: string): ProxyHandler<Map<any, any>>;
export declare function createObjectHandler(vd: Base, conf: FieldConfig, path: string): ProxyHandler<Record<string, any>>;
