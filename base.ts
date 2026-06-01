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
  coerce?: boolean; // coerce is now field level opt-in rather than class level, allowing for more granular control over which fields should attempt type coercion. This is particularly useful in cases where only certain fields (like dates) should be coerced, while others should strictly adhere to their defined types without coercion.
}

export interface SchemaDefinition {
  [key: string]: FieldConfig;
}

export interface parserConfig {
  safe?: boolean;
}

interface BaseConstructor {
  schema: SchemaDefinition;
  immutable?: boolean;
  version?: number;
}

// ==================== TYPE INFERENCE ====================

// 1. Unpack runtime constructor functions into primitive TypeScript types
type UnwrapTypeConstructor<T> =
  T extends StringConstructor ? string :
  T extends NumberConstructor ? number :
  T extends BooleanConstructor ? boolean :
  T extends DateConstructor ? Date :
  T extends ArrayConstructor ? any[] :
  T extends ObjectConstructor ? Record<string, any> :
  T extends new (...args: any[]) => infer R ? R :
  unknown; // Fallback if they passed a literal type

// 2. Extract types for nested structures or simple primitives
type InferFieldRaw<T extends FieldConfig> =
  T['keys'] extends Record<string, FieldConfig> ? InferObject<T> :
  T['values'] extends FieldConfig ? InferArray<T> :
  UnwrapTypeConstructor<T['type']>;

// 3. Handle the 'optional' flag to cleanly append '| undefined' 
type InferField<T extends FieldConfig> = 
  T['optional'] extends true 
    ? InferFieldRaw<T> | undefined
    : InferFieldRaw<T>;

// Helper to strip out keys that should be optional
type OptionalKeys<T extends Record<string, FieldConfig>> = {
  [K in keyof T]: T[K]['optional'] extends true ? K : never
}[keyof T];

// Helper to strip out keys that are strictly required
type RequiredKeys<T extends Record<string, FieldConfig>> = {
  [K in keyof T]: T[K]['optional'] extends true ? never : K
}[keyof T];

// Remap objects cleanly, splitting keys into required and optional buckets
type InferObject<T extends FieldConfig> =
  T['keys'] extends Record<string, FieldConfig>
    ? { [K in RequiredKeys<T['keys']>]: InferFieldRaw<T['keys'][K]> } & 
      { [K in OptionalKeys<T['keys']>]?: InferFieldRaw<T['keys'][K]> }
    : Record<string, any>;

type InferArray<T extends FieldConfig> =
  T['values'] extends FieldConfig
    ? Array<InferField<T['values']>>
    : any[];

// Remap the top-level schema accurately using the same bucket strategy
type SchemaToType<S extends SchemaDefinition> = 
  { [K in RequiredKeys<S>]: InferFieldRaw<S[K]> } & 
  { [K in OptionalKeys<S>]?: InferFieldRaw<S[K]> };

function isNone(that: any): boolean { return that === undefined || that === null; }

export default class Base {
  declare static schema: SchemaDefinition;
  declare static version?: number;
  declare static immutable?: boolean;
  declare version?: number | undefined;

  [key: string]: any;
  
  constructor(obj: Record<string, any>, parseConfig?: parserConfig) {
    this.update(obj, parseConfig, true);
  }

  static createFrom<T extends typeof Base>(
    this: T, 
    obj: SchemaToType<T['schema']>,
    parseConfig?: parserConfig
  ): SchemaToType<T['schema']> {
    return new this(obj, parseConfig) as any;
  }

  update(obj: Record<string, any>, parseConfig?: parserConfig, isNew: boolean = false): void {
    const ctor = this.constructor as typeof Base & BaseConstructor;
    try {
      this.setProperties(ctor.schema, obj as Record<string, any>, isNew);
      if (ctor.version) this["version"] = ctor.version;
    } catch (e) {
      for (const key in Object.keys(this)) this[key] = e; // This will make all properties of the object return the error when accessed, signaling that the object is in an invalid state due to failed validation
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
    if (ctor.immutable && !isNew) throw new Error(`Cannot update immutable object of type ${ctor.name}`);
    if (!isNew) data = { ...this, ...data };

    for (const key in schema) {
      const conf = schema[key];
      let value = data[key];
      if (!conf) throw new Error(`'${key}' has no schema. Either remove it from the schema definition or add a schema for it.`);
      this.runValidate(conf, value, key, isNew, this, key);
    }
  }

  private runValidate(confPassed: FieldConfig, valuePassed: any, path: string, isNew: boolean, container: Record<string, any> = this, propertyName?: string): any {
    const { conf, value } = this.validateType(confPassed, valuePassed, path);
    let toReturn: typeof value.constructor;
    if (conf.type === Array) {
      if (!conf.values) throw new Error(`Missing array value configuration at ${path}`);
      toReturn = [];
      // define non-writable indexed properties to prevent direct overwrites
      for (let i = 0; i < value.length; i++) {
        const validated = this.runValidate(conf.values!, value[i], `${path}[${i}]`, isNew);
        Object.defineProperty(toReturn, `${i}`, {
          value: validated,
          writable: false,
          enumerable: true,
          configurable: true,
        });
      }

      // Monkey-patch the dangerous methods to rebuild the internal indexed props
      const vd = this;

      Object.defineProperty(toReturn, 'push', {
        value: function (...items: any[]) {
          const curr = Array.prototype.slice.call(this) as any[];
          const validatedItems = items.map((item, i) => vd.runValidate(conf.values!, item, `${path}[${curr.length + i}]`, false));
          const result = curr.concat(validatedItems);
          // rebuild index properties
          for (let i = 0; i < (this as any).length; i++) delete (this as any)[i];
          for (let i = 0; i < result.length; i++) Object.defineProperty(this, `${i}`, { value: result[i], writable: false, enumerable: true, configurable: true });
          (this as any).length = result.length;
          return (this as any).length;
        },
        enumerable: false
      });

      Object.defineProperty(toReturn, 'fill', {
        value: function () {
          throw new Error(`Array.fill() is not allowed on validated arrays. Use Array.splice() instead for controlled modifications.`);
        },
        enumerable: false
      });

      Object.defineProperty(toReturn, 'unshift', {
        value: function (...items: any[]) {
          const curr = Array.prototype.slice.call(this) as any[];
          const validatedItems = items.map((item, i) => vd.runValidate(conf.values!, item, `${path}[${i}]`, false));
          const result = validatedItems.concat(curr);
          for (let i = 0; i < (this as any).length; i++) delete (this as any)[i];
          for (let i = 0; i < result.length; i++) Object.defineProperty(this, `${i}`, { value: result[i], writable: false, enumerable: true, configurable: true });
          (this as any).length = result.length;
          return (this as any).length;
        },
        enumerable: false
      });

      Object.defineProperty(toReturn, 'splice', {
        value: function (start: number, deleteCount?: number, ...items: any[]) {
          const curr = Array.prototype.slice.call(this) as any[];
          const len = curr.length;
          const s = start < 0 ? Math.max(len + start, 0) : Math.min(start || 0, len);
          const dc = deleteCount === undefined ? len - s : Math.max(0, Math.min(deleteCount, len - s));
          const validatedItems = items.map((item, i) => vd.runValidate(conf.values!, item, `${path}[${s + i}]`, false));
          const result = curr.slice(0, s).concat(validatedItems).concat(curr.slice(s + dc));
          const deleted = curr.slice(s, s + dc);
          for (let i = 0; i < (this as any).length; i++) delete (this as any)[i];
          for (let i = 0; i < result.length; i++) Object.defineProperty(this, `${i}`, { value: result[i], writable: false, enumerable: true, configurable: true });
          (this as any).length = result.length;
          return deleted;
        },
        enumerable: false
      });

      Object.defineProperty(toReturn, 'concat', {
        value: function (...arrays: any[]) {
          const curr = Array.prototype.slice.call(this) as any[];
          let result = curr;
          for (const arr of arrays) {
            if (!Array.isArray(arr)) throw new Error(`Can only concat arrays to validated array properties.`);
            const validatedItems = arr.map((item, i) => vd.runValidate(conf.values!, item, `${path}[${result.length + i}]`, false));
            result = result.concat(validatedItems);
          }
          return result;
        },
        enumerable: false
      });
    }

    else if (conf.type === Object && conf.keys) {
      const obj: Record<string, any> = {};
      for (const childKey in conf.keys)
        this.runValidate(conf.keys[childKey], value[childKey], `${path}.${childKey}`, isNew, obj, childKey);
      toReturn = obj;
    }

    else toReturn = value;

    const p = path.match(/[^.[\]]+/g)?.reduce((o, key) => o?.[key], this);
    if (conf.immutable && !isNone(p) && p !== toReturn) throw new Error(`Cannot update immutable property '${path}'`);
    if (typeof conf.validate === "function") conf.validate(toReturn);

    if (propertyName !== undefined) {
      let currentValue = toReturn;
      delete container[propertyName];
      Object.defineProperty(container, propertyName, {
        get: () => currentValue,
        set: (newVal) => {
          const ctor = this.constructor as typeof Base & BaseConstructor;
          if (ctor.immutable) throw new Error(`Cannot update immutable object of type ${ctor.name}`);
          this.runValidate(conf, newVal, path, false, container, propertyName);
        },
        enumerable: true,
        configurable: true,
      });
    }
    return toReturn;
  }

  private validateType(conf: FieldConfig, value: any, path: string): { conf: FieldConfig; value: any } {
    if (!conf.type) throw new Error(`Missing type configuration at '${path}'`);
    if (conf.beforeChecks && typeof conf.beforeChecks === "function") {
      const newVal = conf.beforeChecks(value);
      if (!isNone(newVal) || conf.optional) value = newVal;
    }

    if (isNone(value)) {
      if (!isNone(conf.default)) value = typeof conf.default === 'function' ? conf.default() : conf.default;
      if (isNone(value)) {
        if (conf.optional) return { conf, value };
        if (!conf.optional) throw new Error(`Missing required property at '${path}'`);
      }
    }

    if (value.constructor !== conf.type) {
      // Attempt to coerce the value to the correct type if possible. Valuable for date strings from a json for example
      if (conf.coerce) value = new conf.type(value);
      if (value.constructor !== conf.type || isNaN(value))
        throw new Error(`Invalid type at '${path}', expected ${conf.type.name}, got ${value.constructor.name}`);
    }

    if ((conf.max !== undefined) && (value.length ? value.length > conf.max : value > conf.max)) throw new Error(`Value too large for '${path}', maximum: ${conf.max}`);
    if ((conf.min !== undefined) && (value.length ? value.length < conf.min : value < conf.min)) throw new Error(`Value too small for '${path}', minimum: ${conf.min}`);
    if (conf.enum && !conf.enum.includes(value)) throw new Error(`Invalid value for '${path}', expected one of: ${conf.enum.join(", ")}`);
    if (conf.afterChecks && typeof conf.afterChecks === "function") {
      const newVal = conf.afterChecks(value);
      if (!isNone(newVal) || conf.optional) value = newVal;
    }
    return { conf, value };
  }
}
