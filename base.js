// ==================== ERROR CLASSES ====================
export class ModelCoreError extends Error {
    constructor(errObj) {
        super(errObj.message);
        const ctor = this.constructor;
        this.name = ctor.errorName;
        this.source = errObj.source;
        this.path = parsePath(errObj.path);
        this.expected = errObj.expected;
        this.received = errObj.received;
        this.code = errObj.code;
    }
}
ModelCoreError.errorName = "ModelCoreError";
export class ImmutableObjectError extends ModelCoreError {
}
ImmutableObjectError.errorName = "ImmutableObjectError";
export class ImmutablePropertyError extends ModelCoreError {
}
ImmutablePropertyError.errorName = "ImmutablePropertyError";
export class ValidationError extends ModelCoreError {
}
ValidationError.errorName = "ValidationError";
export class EnumValueError extends ModelCoreError {
}
EnumValueError.errorName = "EnumValueError";
export class RangeError extends ModelCoreError {
}
RangeError.errorName = "RangeError";
export class TypeValidationError extends ModelCoreError {
}
TypeValidationError.errorName = "TypeValidationError";
export class MissingPropertyError extends ModelCoreError {
}
MissingPropertyError.errorName = "MissingPropertyError";
export class SchemaDefinitionError extends ModelCoreError {
}
SchemaDefinitionError.errorName = "SchemaDefinitionError";
export class RequiredError extends ModelCoreError {
}
RequiredError.errorName = "RequiredError";
export class ValueError extends ModelCoreError {
}
ValueError.errorName = "ValueError";
// ==================== TYPE INFERENCE ====================
export function Union(...args) {
    var _a;
    if (args.length === 0)
        throw new Error("Union must have at least one type");
    return _a = class union extends ModelCoreUnion {
            constructor() {
                super(...args);
                return this;
            }
        },
        _a.unionTypes = args,
        _a;
}
class ModelCoreUnion extends Array {
}
ModelCoreUnion.unionTypes = [];
// ==================== HELPER FUNCTIONS ====================
function isNone(that) { return that === undefined || that === null; }
function parsePath(path) {
    const parts = [];
    path?.replace(/[^.[\]]+/g, (match) => {
        if (/^\d+$/.test(match))
            parts.push(Number(match));
        else
            parts.push(match);
        return "";
    });
    return parts;
}
export function buildError(errorType, message, source, path, expected, received, code) {
    return new errorType({ message, source, path, expected, received, code });
}
function normalizeConf(conf, path) {
    if (typeof conf === "function")
        return { type: conf };
    if (conf && typeof conf === "object" && 'type' in conf)
        return conf;
    throw buildError(SchemaDefinitionError, `Invalid schema definition for '${path}'`, Base, path, Object, conf, "SCHEMA_DEFINITION_ERROR");
}
// ==================== PROXY HANDLER ====================
function createProxyHandler(ctor) {
    const schema = ctor.schema;
    const immutable = !!(ctor.immutable);
    return {
        get(target, key) {
            if (typeof key === 'symbol')
                return target[key];
            if (key === '__safeSet__')
                return (k, v) => { target[k] = v; }; // This naming is to avoid conflicts with user-defined properties. It's a private method for internal use. Call at your own risk.
            return target[key];
        },
        set(target, key, value) {
            if (typeof key === 'symbol') {
                target[key] = value;
                return true;
            }
            if (immutable)
                throw buildError(ImmutableObjectError, `Cannot update immutable object of type ${ctor.name}`, ctor.name, "", null, value, "IMMUTABLE_CLASS_UPDATE");
            if (typeof key === 'string' && schema && key in schema) {
                const result = target.runValidate(schema[key], value, key, false);
                target[key] = result;
            }
            else {
                target[key] = value;
            }
            return true;
        },
        has(target, key) {
            return key in target;
        },
        ownKeys(target) {
            return Object.keys(target);
        },
        getOwnPropertyDescriptor(target, key) {
            return Object.getOwnPropertyDescriptor(target, key);
        },
        deleteProperty(target, key) {
            if (key in target) {
                delete target[key];
                return true;
            }
            return Reflect.deleteProperty(target, key);
        },
    };
}
// ==================== ARRAY PROXY HANDLER ====================
function createArrayHandler(vd, confValues, path) {
    return {
        get(target, key) {
            if (key === 'push') {
                return function (...items) {
                    const t = target;
                    const validatedItems = items.map((item, i) => vd.runValidate(confValues, item, `${path}[${t.length + i}]`, false));
                    for (let i = 0; i < validatedItems.length; i++)
                        t[t.length + i] = validatedItems[i];
                    return t.length;
                };
            }
            if (key === 'fill') {
                return function () {
                    throw buildError(ValueError, `Array.fill() is not allowed on validated arrays. Use Array.splice() instead for controlled modifications.`, vd.runValidate, path, null, undefined, "INVALID_ARRAY_METHOD");
                };
            }
            if (key === 'unshift') {
                return function (...items) {
                    const t = target;
                    const validatedItems = items.map((item, i) => vd.runValidate(confValues, item, `${path}[${i}]`, false));
                    for (let i = t.length - 1; i >= 0; i--)
                        t[i + validatedItems.length] = t[i];
                    for (let i = 0; i < validatedItems.length; i++)
                        t[i] = validatedItems[i];
                    return t.length;
                };
            }
            if (key === 'splice') {
                return function (start, deleteCount, ...items) {
                    const t = target;
                    const curr = Array.prototype.slice.call(t);
                    const len = curr.length;
                    const s = start < 0 ? Math.max(len + start, 0) : Math.min(start || 0, len);
                    const dc = deleteCount === undefined ? len - s : Math.max(0, Math.min(deleteCount, len - s));
                    const validatedItems = items.map((item, i) => vd.runValidate(confValues, item, `${path}[${s + i}]`, false));
                    const result = curr.slice(0, s).concat(validatedItems).concat(curr.slice(s + dc));
                    const deleted = curr.slice(s, s + dc);
                    for (let i = 0; i < t.length; i++)
                        delete t[i];
                    for (let i = 0; i < result.length; i++)
                        t[i] = result[i];
                    t.length = result.length;
                    return deleted;
                };
            }
            if (key === 'concat') {
                return function (...arrays) {
                    const t = target;
                    const curr = Array.prototype.slice.call(t);
                    let result = curr;
                    for (const arr of arrays) {
                        if (!Array.isArray(arr))
                            throw buildError(ValueError, 'Can only concat arrays to validated array properties.', vd.runValidate, path, Array, arr, "INVALID_CONCAT_VALUE");
                        const validatedItems = arr.map((item, i) => vd.runValidate(confValues, item, `${path}[${result.length + i}]`, false));
                        result = result.concat(validatedItems);
                    }
                    return result;
                };
            }
            return target[key];
        },
        set(target, key, value) {
            if (typeof key === 'symbol') {
                target[key] = value;
                return true;
            }
            if (key === 'length') {
                target.length = value;
                return true;
            }
            const numKey = typeof key === 'string' ? Number(key) : NaN;
            if (!isNaN(numKey) && key !== '') {
                const validated = vd.runValidate(confValues, value, `${path}[${numKey}]`, false);
                target[numKey] = validated;
                return true;
            }
            target[key] = value;
            return true;
        },
    };
}
// ==================== SET PROXY HANDLER ====================
function createSetHandler(vd, confValues, path) {
    return {
        get(target, key) {
            if (key === "add") {
                return (value) => {
                    const validated = vd.runValidate(confValues, value, `${path}[${target.size}]`, false);
                    target.add(validated);
                    return target;
                };
            }
            const value = Reflect.get(target, key, target);
            if (typeof value === "function")
                return value.bind(target);
            return value;
        }
    };
}
// ==================== MAP PROXY HANDLER ====================
function createMapHandler(vd, conf, path) {
    const keys = conf.keys || conf.properties || {};
    return {
        get(target, key) {
            if (typeof key === 'symbol')
                return target.get(key);
            if (key === 'set') {
                return function (k, v) {
                    if (k in keys) {
                        const validated = vd.runValidate(keys[k], v, `${path}.${k}`, false);
                        target.set(k, validated);
                    }
                    return target;
                };
            }
            const value = Reflect.get(target, key, target);
            if (typeof value === "function")
                return value.bind(target);
            return value;
        },
        set(target, key, value) {
            if (typeof key === 'symbol') {
                target.set(key, value);
                return true;
            }
            if (key in keys) {
                const validated = vd.runValidate(keys[key], value, `${path}.${key}`, false);
                target.set(key, validated);
                return true;
            }
            target.set(key, value);
            return true;
        }
    };
}
// ==================== OBJECT PROXY HANDLER ====================
function createObjectHandler(vd, conf, path) {
    const keys = conf.keys || conf.properties || {};
    return {
        get(target, key) {
            if (typeof key === 'symbol')
                return target[key];
            return target[key];
        },
        set(target, key, value) {
            if (typeof key === 'symbol') {
                target[key] = value;
                return true;
            }
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
const handlerCache = new WeakMap();
export default class Base {
    constructor(obj, parseConfig) {
        this.update(obj, parseConfig, true);
        const ctor = this.constructor;
        return new Proxy(this, ctor.__proxyHandler || (ctor.__proxyHandler = createProxyHandler(ctor)));
    }
    static addValidationHandler(handlerName, handler) {
        const ctor = this;
        if (!ctor.validationHandlers)
            ctor.validationHandlers = new Map();
        if (!ctor.validationHandlers.has(handlerName))
            ctor.validationHandlers.set(handlerName, handler);
    }
    static removeValidationHandler(handlerName) {
        const ctor = this;
        if (ctor.validationHandlers && ctor.validationHandlers.has(handlerName))
            ctor.validationHandlers.delete(handlerName);
    }
    static createFrom(obj, parseConfig) {
        return new this(obj, parseConfig);
    }
    static create(obj, parseConfig) {
        return new this(obj, parseConfig);
    }
    update(obj, parseConfig, isNew = false) {
        const ctor = this.constructor;
        try {
            if (!obj || typeof obj !== "object")
                throw TypeError("Input must be an object");
            this.setProperties(ctor.schema, obj, isNew);
        }
        catch (e) {
            for (const key in this) {
                delete this[key];
                Object.defineProperty(this, key, {
                    value: e,
                    writable: false,
                    enumerable: true,
                    configurable: true,
                });
            }
            if (!parseConfig?.safe)
                throw e;
        }
    }
    toObject() {
        const obj = {};
        for (const key in this)
            obj[key] = this[key];
        return obj;
    }
    json() { return JSON.stringify(this.toObject()); }
    setProperties(schema, data, isNew = false) {
        const ctor = this.constructor;
        if (ctor.immutable && !isNew)
            throw buildError(ImmutableObjectError, `Cannot update immutable object of type ${ctor.name}`, ctor.name, "", null, data, "IMMUTABLE_CLASS_UPDATE");
        for (const key in schema) {
            if (!isNew && !(key in data))
                continue;
            const conf = schema[key];
            const value = data[key];
            const result = this.runValidate(conf, value, key, isNew);
            if (isNew)
                this[key] = result;
            else
                this.__safeSet__(key, result);
        }
    }
    runValidate(confPassed, valuePassed, path, isNew) {
        const { conf, value } = this.validateType(confPassed, valuePassed, path);
        let toReturn;
        const unionTypes = conf.type === ModelCoreUnion ? new conf.type() : conf.type.prototype instanceof ModelCoreUnion ? new conf.type() : null;
        const isArray = conf.type === Array ||
            (unionTypes && unionTypes.some((t) => t === Array || t.prototype instanceof Array))
            || (!unionTypes && conf.type.prototype instanceof Array);
        const isSet = !isArray && (conf.type === Set ||
            (unionTypes && unionTypes.some((t) => t === Set || t.prototype instanceof Set))
            || (!unionTypes && conf.type.prototype instanceof Set));
        const isObject = !isArray && !isSet && (conf.type === Object || (unionTypes && unionTypes.some((t) => t === Object)));
        const isMap = !isArray && !isSet && !isObject && (conf.type === Map || (unionTypes && unionTypes.some((t) => t === Map || t.prototype instanceof Map)));
        if (isArray || isSet) {
            if (!conf.values)
                throw buildError(SchemaDefinitionError, `Missing array value configuration at ${path}`, this.runValidate, path, Object, value, "SCHEMA_DEFINITION_ERROR");
            toReturn = new conf.type();
            const arrValue = isArray ? value : Array.from(value);
            for (let i = 0; i < arrValue.length; i++) {
                const validated = this.runValidate(conf.values, arrValue[i], `${path}[${i}]`, isNew);
                if (isSet)
                    toReturn.add(validated);
                else
                    toReturn[i] = validated;
            }
            let handler;
            if (!isNew) {
                let cache = handlerCache.get(this);
                if (!cache) {
                    cache = new Map();
                    handlerCache.set(this, cache);
                }
                handler = cache.get(path);
                if (!handler) {
                    handler = isArray ? createArrayHandler(this, conf.values, path) : createSetHandler(this, conf.values, path);
                    cache.set(path, handler);
                }
            }
            else {
                handler = isArray ? createArrayHandler(this, conf.values, path) : createSetHandler(this, conf.values, path);
            }
            toReturn = new Proxy(toReturn, handler);
        }
        else if (isObject || isMap) {
            if (!conf.keys && !conf.properties)
                throw buildError(SchemaDefinitionError, `Object properties schema definition missing for '${path}'`, this.runValidate, path, Object, conf, 'SCHEMA_DEFINITION_ERROR');
            const obj = isObject ? {} : new Map();
            for (const childKey in conf.keys || conf.properties || {}) {
                const childConf = (conf.keys || conf.properties || {})[childKey];
                const childVal = this.runValidate(childConf, isObject ? value?.[childKey] : value.get(childKey), `${path}.${childKey}`, isNew);
                ;
                if (isObject)
                    obj[childKey] = childVal;
                else
                    obj.set(childKey, childVal);
            }
            let handler;
            if (!isNew) {
                let cache = handlerCache.get(this);
                if (!cache) {
                    cache = new Map();
                    handlerCache.set(this, cache);
                }
                handler = cache.get(path);
                if (!handler) {
                    handler = isObject ? createObjectHandler(this, conf, path) : createMapHandler(this, conf, path);
                    cache.set(path, handler);
                }
            }
            else {
                handler = isObject ? createObjectHandler(this, conf, path) : createMapHandler(this, conf, path);
            }
            toReturn = new Proxy(obj, handler);
        }
        else
            toReturn = value;
        if (conf.immutable && !isNew) {
            const startObj = this;
            const p = path.match(/[^.[\]]+/g)?.reduce((o, key) => o?.[key], startObj);
            if (!isNone(p) && p !== toReturn)
                throw buildError(ImmutablePropertyError, `Cannot update immutable property '${path}'`, this.constructor.name, path, null, value, "IMMUTABLE_PROPERTY_UPDATE");
        }
        if (conf.validate && typeof conf.validate === "function")
            conf.validate(toReturn);
        return toReturn;
    }
    validateType(cnf, value, path) {
        const conf = normalizeConf(cnf, path);
        const ctor = this.constructor;
        const unionTypes = conf.type === ModelCoreUnion ? new conf.type() : conf.type.prototype instanceof ModelCoreUnion ? new conf.type() : null;
        if (conf.beforeChecks && typeof conf.beforeChecks === "function") {
            const newVal = conf.beforeChecks(value);
            if (!isNone(newVal) || conf.optional)
                value = newVal;
        }
        if (isNone(value)) {
            if (!isNone(conf.default))
                value = typeof conf.default === 'function' ? conf.default() : conf.default;
            if (isNone(value)) {
                if (conf.optional || conf.required === false)
                    return { conf, value };
                if (conf.required === true || conf.optional === false || ctor.autorequire || ctor.autorequire === undefined)
                    throw buildError(RequiredError, `Missing required property at '${path}'`, this.validateType, path, conf.type, value, "REQUIRED_PROPERTY_MISSING");
                return { conf, value };
            }
        }
        const isOfType = () => {
            return (unionTypes && unionTypes.some((t) => value.constructor === t)) || value.constructor === conf.type;
        };
        if (!isOfType()) {
            // Attempt to coerce the value to the correct type if possible. Valuable for date strings from a json for example
            if (conf.coerce)
                value = !unionTypes ? new conf.type(value) : (() => {
                    // dangerous but necessary! Javascript will most probably coerce in an invalid way 
                    // like `new Array({}) = [{}]` instead of throwing so we can check the next type.
                    // We have to accept the language's downsides here. 
                    // Avoid coercion on Unions unless you're sure about the input, as it can lead to unexpected results.
                    // You can instead use beforeChecks() hook to preprocess the value for safety and control.
                    for (const t of unionTypes) {
                        const coerced = new t(value);
                        if (coerced.constructor === t)
                            return coerced;
                    }
                })();
            if (!isOfType() || isNaN(value))
                throw buildError(TypeValidationError, `Invalid type at '${path}', expected ${conf.type.name}, got ${value.constructor.name}`, this.constructor.name, path, conf.type, value, "INVALID_TYPE");
        }
        if ((conf.max !== undefined) && (value.length ? value.length > conf.max : value > conf.max))
            throw buildError(RangeError, `Value too large for '${path}', maximum: ${conf.max}`, this.validateType, path, conf.max, value, "VALUE_TOO_LARGE");
        if ((conf.min !== undefined) && (value.length ? value.length < conf.min : value < conf.min))
            throw buildError(RangeError, `Value too small for '${path}', minimum: ${conf.min}`, this.validateType, path, conf.min, value, "VALUE_TOO_SMALL");
        if (conf.enum && !conf.enum.includes(value))
            throw buildError(EnumValueError, `Invalid value for '${path}', expected one of: ${conf.enum.join(", ")}`, this.validateType, path, conf.enum, value, "INVALID_ENUM_VALUE");
        if (ctor.validationHandlers)
            for (const [, handler] of ctor.validationHandlers)
                if (typeof handler === "function")
                    handler(conf, value, path);
        if (conf.afterChecks && typeof conf.afterChecks === "function") {
            const newVal = conf.afterChecks(value);
            if (!isNone(newVal) || conf.optional)
                value = newVal;
        }
        return { conf, value };
    }
}
