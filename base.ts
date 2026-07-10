export interface FieldConfig {
  type: any;
  immutable?: boolean;
  optional?: boolean;
  required?: boolean; // Alias for optional: false, included for clarity and flexibility in schema definitions
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
  [key: string]: any; // Allows additional properties for extensibility
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

// ==================== ERROR CLASSES ====================

export class ModelCoreError extends Error {
  declare source: string | Function | undefined;
  declare path: Array<string | number>;
  declare expected: any;
  declare received: any;
  declare code: string | undefined;
  static errorName: string = "ModelCoreError";

  constructor(errObj: errorObject) {
    super(errObj.message);
    const ctor = this.constructor as typeof ModelCoreError;
    this.name = ctor.errorName;
    this.source = errObj.source;
    this.path = parsePath(errObj.path);
    this.expected = errObj.expected;
    this.received = errObj.received;
    this.code = errObj.code;
  }
}

export class ImmutableObjectError extends ModelCoreError { static errorName: string = "ImmutableObjectError" }
export class ImmutablePropertyError extends ModelCoreError { static errorName: string = "ImmutablePropertyError" }
export class ValidationError extends ModelCoreError { static errorName: string = "ValidationError" }
export class EnumValueError extends ModelCoreError { static errorName: string = "EnumValueError" }
export class RangeError extends ModelCoreError { static errorName: string = "RangeError" }
export class TypeValidationError extends ModelCoreError { static errorName: string = "TypeValidationError" }
export class MissingPropertyError extends ModelCoreError { static errorName: string = "MissingPropertyError" }
export class SchemaDefinitionError extends ModelCoreError { static errorName: string = "SchemaDefinitionError" }
export class RequiredError extends ModelCoreError { static errorName: string = "RequiredError" }
export class ValueError extends ModelCoreError { static errorName: string = "ValueError" }


// ==================== TYPE INFERENCE ====================

export function Union<
  T extends readonly (abstract new (...args: any) => any)[]
>(...args: T) {
  if (args.length === 0) throw new Error("Union must have at least one type");
  return class union extends ModelCoreUnion {
    static unionTypes: T = args
    constructor() {
      super(...args)
      return this as InstanceType<T[number]>;
    }
  };
}

class ModelCoreUnion extends Array<any> {
  static unionTypes: readonly any[] = []
}

type UnwrapTypeConstructor<T> =
  T extends StringConstructor ? string :
  T extends NumberConstructor ? number :
  T extends BooleanConstructor ? boolean :
  T extends DateConstructor ? Date :
  T extends ArrayConstructor ? any[] :
  T extends ObjectConstructor ? Record<string, any> :
  T extends new (...args: any[]) => infer R ? R :
  unknown;

// 2. Normalize a field: detect if it's a shorthand constructor or a config object
type NormalizeField<T> = T extends FieldConfig ? T : { type: T }

// 3. Extract types for nested structures or simple primitives (using normalized fields)
type InferFieldRaw<T> = 
  NormalizeField<T> extends infer F extends FieldConfig ?
    F['type'] extends { unionTypes: readonly any[] } ? InstanceType<F['type']['unionTypes'][number]> :
     F['type'] extends ObjectConstructor ? InferObject<F> :
      F['type'] extends ArrayConstructor ? InferArray<F> :
      UnwrapTypeConstructor<F['type']>
    : any;

// 4. Helper to cleanly separate required vs optional keys
type OptionalKeys<T extends Record<string, any>> = {
  [K in keyof T]: NormalizeField<T[K]>['optional'] extends true ? K : NormalizeField<T[K]>['required'] extends false ? K : never
}[keyof T];

type RequiredKeys<T extends Record<string, any>> = {
  [K in keyof T]: NormalizeField<T[K]>['optional'] extends true ? never : NormalizeField<T[K]>['required'] extends false ? never : K
}[keyof T];

// 5. Remap objects cleanly, handling both shorthand and verbose nested keys
type InferObject<T extends FieldConfig> =
  T['keys'] extends Record<string, any>
    ? { [K in RequiredKeys<T['keys']>]: InferFieldRaw<T['keys'][K]> } & 
      { [K in OptionalKeys<T['keys']>]?: InferFieldRaw<T['keys'][K]> }
    : Record<string, any>;

type InferArray<T extends FieldConfig> = T['type'] extends ArrayConstructor ? Array<InferFieldRaw<T['values']>> : any[];

// 6. Map over the entire schema definition (handles mix of shorthand and verbose keys)
export type SchemaToType<S extends Record<string, any>> = 
  { [K in RequiredKeys<S>]: InferFieldRaw<S[K]> } & 
  { [K in OptionalKeys<S>]?: InferFieldRaw<S[K]> };


// ==================== HELPER FUNCTIONS ====================

function isNone(that: any): boolean { return that === undefined || that === null; }

function parsePath(path: string | undefined): Array<string | number> {
  const parts: Array<string | number> = [];
  path?.replace(/[^.[\]]+/g, (match) => {
    if (/^\d+$/.test(match)) parts.push(Number(match));
    else parts.push(match);
    return "";
  });
  return parts;
}

export function buildError(
  errorType: new (errObj: errorObject) => ModelCoreError,
  message: string,
  source?: string | Function,
  path?: string,
  expected?: any,
  received?: any,
  code?: string
): ModelCoreError {
  return new errorType({ message, source, path, expected, received, code });
}

function normalizeConf(conf: FieldConfig | any, path: string): FieldConfig {
  if (typeof conf === "function") return { type: conf } as FieldConfig;
  if (conf && typeof conf === "object" && 'type' in conf) return conf as FieldConfig;
  throw buildError(SchemaDefinitionError, `Invalid schema definition for '${path}'`, undefined, path, null, undefined, "SCHEMA_DEFINITION_ERROR");
}


// ==================== PROXY HANDLER ====================

function createProxyHandler(ctor: typeof Base & BaseConstructor): ProxyHandler<Base> {
  const schema = ctor.schema;
  const immutable = !!(ctor.immutable);

  return {
    get(target: any, key: string | symbol): any {
      if (typeof key === 'symbol') return target[key];
      if (key === '__safeSet__') return (k: string, v: any) => { target[k] = v; }; // This naming is to avoid conflicts with user-defined properties. It's a private method for internal use. Call at your own risk.
      return target[key];
    },
    set(target: any, key: string | symbol, value: any): boolean {
      if (typeof key === 'symbol') { target[key] = value; return true; }

      if (immutable)
        throw buildError(ImmutableObjectError, `Cannot update immutable object of type ${ctor.name}`, ctor.name, "", null, value, "IMMUTABLE_CLASS_UPDATE");

      if (typeof key === 'string' && schema && key in schema) {
        const result = (target as any).runValidate(schema[key], value, key, false);
        target[key] = result;
      } else {
        target[key] = value;
      }
      return true;
    },
    has(target: any, key: string | symbol): boolean {
      return key in target;
    },
    ownKeys(target: any): Array<string | symbol> {
      return Object.keys(target);
    },
    getOwnPropertyDescriptor(target: any, key: string | symbol): PropertyDescriptor | undefined {
      return Object.getOwnPropertyDescriptor(target, key);
    },
    deleteProperty(target: any, key: string | symbol): boolean {
      if (key in target) {
        delete target[key];
        return true;
      }
      return Reflect.deleteProperty(target, key);
    },
  };
}


// ==================== ARRAY PROXY HANDLER ====================

function createArrayHandler(vd: Base, confValues: Function | FieldConfig, path: string): ProxyHandler<any[]> {
  return {
    get(target: any[], key: string | symbol): any {
      if (key === 'push') {
        return function (...items: any[]) {
          const t = target;
          const validatedItems = items.map((item: any, i: number) => vd.runValidate(confValues, item, `${path}[${t.length + i}]`, false));
          for (let i = 0; i < validatedItems.length; i++) t[t.length + i] = validatedItems[i];
          return t.length;
        };
      }
      if (key === 'fill') {
        return function () {
          throw buildError(ValueError, `Array.fill() is not allowed on validated arrays. Use Array.splice() instead for controlled modifications.`, vd.runValidate, path, null, undefined, "INVALID_ARRAY_METHOD");
        };
      }
      if (key === 'unshift') {
        return function (...items: any[]) {
          const t = target;
          const validatedItems = items.map((item: any, i: number) => vd.runValidate(confValues, item, `${path}[${i}]`, false));
          for (let i = t.length - 1; i >= 0; i--) t[i + validatedItems.length] = t[i];
          for (let i = 0; i < validatedItems.length; i++) t[i] = validatedItems[i];
          return t.length;
        };
      }
      if (key === 'splice') {
        return function (start: number, deleteCount: number, ...items: any[]) {
          const t = target;
          const curr = Array.prototype.slice.call(t);
          const len = curr.length;
          const s = start < 0 ? Math.max(len + start, 0) : Math.min(start || 0, len);
          const dc = deleteCount === undefined ? len - s : Math.max(0, Math.min(deleteCount, len - s));
          const validatedItems = items.map((item: any, i: number) => vd.runValidate(confValues, item, `${path}[${s + i}]`, false));
          const result = curr.slice(0, s).concat(validatedItems).concat(curr.slice(s + dc));
          const deleted = curr.slice(s, s + dc);
          for (let i = 0; i < t.length; i++) delete t[i];
          for (let i = 0; i < result.length; i++) t[i] = result[i];
          t.length = result.length;
          return deleted;
        };
      }
      if (key === 'concat') {
        return function (...arrays: any[]) {
          const t = target;
          const curr = Array.prototype.slice.call(t);
          let result: any[] = curr;
          for (const arr of arrays) {
            if (!Array.isArray(arr))
              throw buildError(ValueError, 'Can only concat arrays to validated array properties.', vd.runValidate, path, null, undefined, "INVALID_CONCAT_VALUE");
            const validatedItems = arr.map((item: any, i: number) => vd.runValidate(confValues, item, `${path}[${result.length + i}]`, false));
            result = result.concat(validatedItems);
          }
          return result;
        };
      }
      return (target as any)[key];
    },
    set(target: any[], key: string | symbol, value: any): boolean {
      if (typeof key === 'symbol') { (target as any)[key] = value; return true; }
      if (key === 'length') { target.length = value; return true; }
      const numKey = typeof key === 'string' ? Number(key) : NaN;
      if (!isNaN(numKey) && key !== '') {
        const validated = vd.runValidate(confValues, value, `${path}[${numKey}]`, false);
        target[numKey] = validated;
        return true;
      }
      (target as any)[key] = value;
      return true;
    },
  };
}

/**
 * TODO: Handle other types like Set, Map, etc.
 *
 */

// ==================== OBJECT PROXY HANDLER ====================

function createObjectHandler(vd: Base, conf: FieldConfig, path: string): ProxyHandler<Record<string, any>> {
  const keys = conf.keys || conf.properties || {};
  return {
    get(target: Record<string, any>, key: string | symbol): any {
      if (typeof key === 'symbol') return target[key as any];
      return target[key];
    },
    set(target: Record<string, any>, key: string | symbol, value: any): boolean {
      if (typeof key === 'symbol') { target[key as any] = value; return true; }
      if (key in keys) {
        const result = vd.runValidate(keys[key], value, `${path}.${key}`, false);
        target[key] = result;
        return true;
      }
      target[key] = value;
      return true;
    },
  };
}


// ==================== BASE CLASS ====================

const handlerCache = new WeakMap<Base, Map<string, ProxyHandler<any>>>();

export default class Base {
  declare static schema: SchemaDefinition;
  declare static version?: number;
  declare static immutable?: boolean;
  declare static validationHandlers: Array<Function>;
  declare static autorequire?: boolean;

  [key: string]: any;


  constructor(obj: Record<string, any>, parseConfig?: parserConfig) {
    this.update(obj, parseConfig, true);
    const ctor = this.constructor as typeof Base & BaseConstructor;
    return new Proxy(this, ctor.__proxyHandler || (ctor.__proxyHandler = createProxyHandler(ctor)));
  }

  static addValidationHandler(handler: Function) {
    if (!Base.validationHandlers) Base.validationHandlers = [];
    Base.validationHandlers.push(handler);
  }

  static createFrom<T extends typeof Base>(
    this: T, 
    obj: SchemaToType<T['schema']>,
    parseConfig?: parserConfig
  ): SchemaToType<T['schema']> {
    return new this(obj, parseConfig) as any;
  }

  static create<T extends typeof Base>(
    this: T, 
    obj: SchemaToType<T['schema']>,
    parseConfig?: parserConfig
  ): SchemaToType<T['schema']> {
    return new this(obj, parseConfig) as any;
  }

  update(obj: Record<string, any>, parseConfig?: parserConfig, isNew: boolean = false): void {
    const ctor = this.constructor as typeof Base & BaseConstructor;
    try {
      if (!obj || typeof obj !== "object") throw TypeError("Input must be an object");
      this.setProperties(ctor.schema, obj as Record<string, any>, isNew);
      if (ctor.version) this.version = ctor.version;
    } catch (e) {
      for (const key in this) {
        delete this[key];
        Object.defineProperty(this, key, {
          value: e,
          writable: false,
          enumerable: true,
          configurable: true,
        });
      }
      if (!parseConfig?.safe) throw e;
    }
  }

  toObject(): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const key in this) obj[key] = this[key];
    return obj;
  }

  json(): string { return JSON.stringify(this.toObject()); }

  private setProperties(schema: SchemaDefinition, data: Record<string, any>, isNew: boolean = false): void {
    const ctor = this.constructor as typeof Base & BaseConstructor;
    if (ctor.immutable && !isNew)
      throw buildError(
        ImmutableObjectError, `Cannot update immutable object of type ${ctor.name}`,
        ctor.name, "", null, data, "IMMUTABLE_CLASS_UPDATE"
      );

    for (const key in schema) {
      if (!isNew && !(key in data)) continue;
      const conf = schema[key];
      const value = data[key];
      const result = this.runValidate(conf, value, key, isNew);
      if (isNew) this[key] = result;
      else this.__safeSet__(key, result);
    }
  }

  runValidate(confPassed: FieldConfig | Function, valuePassed: any, path: string, isNew: boolean): any {
    const { conf, value } = this.validateType(confPassed, valuePassed, path);
    let toReturn: typeof conf.type;
    const unionTypes = conf.type === ModelCoreUnion ? new conf.type() : conf.type.prototype instanceof ModelCoreUnion ? new conf.type() : null;
    if (
      conf.type === Array ||
      (unionTypes && unionTypes.some((t: any) => t === Array || t.prototype instanceof Array))
      || (!unionTypes && conf.type.prototype instanceof Array)
    ) {
      if (!conf.values) throw buildError(
        SchemaDefinitionError, `Missing array value configuration at ${path}`,
        this.runValidate, path, null, value, "SCHEMA_DEFINITION_ERROR"
      );

      toReturn = new conf.type();
      for (let i = 0; i < value.length; i++) {
        const validated = this.runValidate(conf.values!, value[i], `${path}[${i}]`, isNew);
        toReturn[i] = validated;
      }

      let handler: ProxyHandler<any> | undefined;
      if (!isNew) {
        let cache = handlerCache.get(this);
        if (!cache) { cache = new Map(); handlerCache.set(this, cache); }
        handler = cache.get(path);
        if (!handler) { handler = createArrayHandler(this, conf.values!, path); cache.set(path, handler); }
      } else {
        handler = createArrayHandler(this, conf.values!, path);
      }
      toReturn = new Proxy(toReturn, handler);
    }

    else if (conf.type === Object || (unionTypes && unionTypes.some((t: any) => t === Object))) {
      if (!conf.keys && !conf.properties)
        throw buildError(SchemaDefinitionError, `Object properties schema definition missing for '${path}'`, this.runValidate, path, value.constructor, conf, 'SCHEMA_DEFINITION_ERROR')
      const obj: Record<string, any> = {};
      for (const childKey in conf.keys) {
        const childVal = this.runValidate(conf.keys[childKey], value?.[childKey], `${path}.${childKey}`, isNew);
        obj[childKey] = childVal;
      }
      let handler: ProxyHandler<any> | undefined;
      if (!isNew) {
        let cache = handlerCache.get(this);
        if (!cache) { cache = new Map(); handlerCache.set(this, cache); }
        handler = cache.get(path);
        if (!handler) { handler = createObjectHandler(this, conf, path); cache.set(path, handler); }
      } else {
        handler = createObjectHandler(this, conf, path);
      }
      toReturn = new Proxy(obj, handler);
    }

    else toReturn = value;

    if (conf.immutable && !isNew) {
      const startObj = this;
      const p = path.match(/[^.[\]]+/g)?.reduce((o, key) => o?.[key], startObj);
      if (!isNone(p) && p !== toReturn)
        throw buildError(ImmutablePropertyError, `Cannot update immutable property '${path}'`, this.constructor.name, path, null, value, "IMMUTABLE_PROPERTY_UPDATE");
    }

    if (conf.validate && typeof conf.validate === "function") conf.validate(toReturn);

    return toReturn;
  }

  private validateType(cnf: any, value: any, path: string): { conf: FieldConfig; value: any } {
    const conf: FieldConfig = normalizeConf(cnf, path);
    const unionTypes = conf.type === ModelCoreUnion ? new conf.type() : conf.type.prototype instanceof ModelCoreUnion ? new conf.type() : null;
    if (conf.beforeChecks && typeof conf.beforeChecks === "function") {
      const newVal = conf.beforeChecks(value);
      if (!isNone(newVal) || conf.optional) value = newVal;
    }

    if (isNone(value)) {
      if (!isNone(conf.default)) value = typeof conf.default === 'function' ? conf.default() : conf.default;
      if (isNone(value)) {
        if (conf.optional || conf.required === false) return { conf, value };
        if (conf.required === true || conf.optional === false)
          throw buildError(RequiredError, `Missing required property at '${path}'`, this.validateType, path, null, value, "REQUIRED_PROPERTY_MISSING");
        if (Base.autorequire || Base.autorequire === undefined)
          throw buildError(RequiredError, `Missing required property at '${path}'`, this.validateType, path, null, value, "REQUIRED_PROPERTY_MISSING");
        return { conf, value };
      }
    }

    const isOfType = () => {
      return (unionTypes && unionTypes.some((t: any) => value.constructor === t)) || value.constructor === conf.type
    };

    if (!isOfType()) {
      // Attempt to coerce the value to the correct type if possible. Valuable for date strings from a json for example
      if (conf.coerce) value = !unionTypes ? new conf.type(value) : (() => {
        // dangerous but necessary! Javascript will most probably coerce in an invalid way 
        // like `new Array({}) = [{}]` instead of throwing so we can check the next type.
        // We have to accept the language's downsides here. 
        // Avoid coercion on Unions unless you're sure about the input, as it can lead to unexpected results.
        // You can instead use beforeChecks() hook to preprocess the value for safety and control.
        for (const t of unionTypes) {
          const coerced = new t(value);
          if (coerced.constructor === t) return coerced;
        }
      })();

      if (!isOfType() || isNaN(value))
        throw buildError(TypeValidationError, `Invalid type at '${path}', expected ${conf.type.name}, got ${value.constructor.name}`, this.constructor.name, path, null, value, "INVALID_TYPE");
    }

    if ((conf.max !== undefined) && (value.length ? value.length > conf.max : value > conf.max)) throw buildError(RangeError, `Value too large for '${path}', maximum: ${conf.max}`, this.validateType, path, null, value, "VALUE_TOO_LARGE");
    if ((conf.min !== undefined) && (value.length ? value.length < conf.min : value < conf.min)) throw buildError(RangeError, `Value too small for '${path}', minimum: ${conf.min}`, this.validateType, path, null, value, "VALUE_TOO_SMALL");
    if (conf.enum && !conf.enum.includes(value)) throw buildError(EnumValueError, `Invalid value for '${path}', expected one of: ${conf.enum.join(", ")}`, this.validateType, path, null, value, "INVALID_ENUM_VALUE");

    for (const handler of Base.validationHandlers || []) {
      if (typeof handler === "function") handler(conf, value, path);
    }

    if (conf.afterChecks && typeof conf.afterChecks === "function") {
      const newVal = conf.afterChecks(value);
      if (!isNone(newVal) || conf.optional) value = newVal;
    }
    return { conf, value };
  }
}
