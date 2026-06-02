// ==================== ERROR CLASSES ====================
export class ModelCoreError extends Error {
    constructor(errObj) {
        super(errObj.message);
        const ctor = this.constructor;
        this.name = ctor.errorName;
        this.source = errObj.source;
        this.path = typeof errObj.path === "string" ? parsePath(errObj.path) : errObj.path;
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
// ==================== HELPER FUNCTIONS ====================
function isNone(that) { return that === undefined || that === null; }
function parsePath(path) {
    const parts = [];
    path.replace(/[^.[\]]+/g, (match) => {
        if (/^\d+$/.test(match))
            parts.push(Number(match));
        else
            parts.push(match);
        return "";
    });
    return parts;
}
function buildError(errorType, message, source, path, expected, received, code) {
    return new errorType({ message, source, path, expected, received, code });
}
// ==================== BASE CLASS ====================
export default class Base {
    constructor(obj, parseConfig) {
        this.update(obj, parseConfig, true);
    }
    static createFrom(obj, parseConfig) {
        return new this(obj, parseConfig);
    }
    update(obj, parseConfig, isNew = false) {
        const ctor = this.constructor;
        try {
            if (!obj || typeof obj !== "object")
                throw TypeError("Input must be an object");
            this.setProperties(ctor.schema, obj, isNew);
            if (ctor.version)
                this["version"] = ctor.version;
        }
        catch (e) {
            for (const key in this) {
                // This will make all properties of the object return the error when accessed,
                // signaling that the object is in an invalid state due to failed validation
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
        if (!isNew)
            data = { ...this, ...data };
        for (const key in schema) {
            const conf = schema[key];
            let value = data[key];
            if (!conf)
                throw buildError(SchemaDefinitionError, `'${key}' has no schema. Either remove it from the schema definition or add a schema for it.`, ctor.name, key, null, data[key], "SCHEMA_DEFINITION_ERROR");
            this.runValidate(conf, value, key, isNew, this, key);
        }
    }
    runValidate(confPassed, valuePassed, path, isNew, container = this, propertyName) {
        const { conf, value } = this.validateType(confPassed, valuePassed, path);
        let toReturn;
        if (conf.type === Array || conf.type.prototype instanceof Array) {
            if (!conf.values)
                throw buildError(SchemaDefinitionError, `Missing array value configuration at ${path}`, this.runValidate, path, null, value, "SCHEMA_DEFINITION_ERROR");
            toReturn = new conf.type(); // This typing allows us to define non-writable index properties while still maintaining the correct item type for editor hovers and validation
            // define non-writable indexed properties to prevent direct overwrites
            for (let i = 0; i < value.length; i++) {
                const validated = this.runValidate(conf.values, value[i], `${path}[${i}]`, isNew);
                Object.defineProperty(toReturn, `${i}`, {
                    value: validated,
                    writable: false,
                    enumerable: true,
                    configurable: true,
                });
            }
            // Monkey-patch Array dangerous methods
            const vd = this;
            Object.defineProperty(toReturn, 'push', {
                value: function (...items) {
                    const curr = Array.prototype.slice.call(this);
                    const validatedItems = items.map((item, i) => vd.runValidate(conf.values, item, `${path}[${curr.length + i}]`, false));
                    const result = curr.concat(validatedItems);
                    // rebuild index properties
                    for (let i = 0; i < this.length; i++)
                        delete this[i];
                    for (let i = 0; i < result.length; i++)
                        Object.defineProperty(this, `${i}`, { value: result[i], writable: false, enumerable: true, configurable: true });
                    this.length = result.length;
                    return this.length;
                },
                enumerable: false
            });
            Object.defineProperty(toReturn, 'fill', {
                value: function () {
                    throw buildError(ValueError, `Array.fill() is not allowed on validated arrays. Use Array.splice() instead for controlled modifications.`, this.validateType, path, null, value, "INVALID_ARRAY_METHOD");
                },
                enumerable: false
            });
            Object.defineProperty(toReturn, 'unshift', {
                value: function (...items) {
                    const curr = Array.prototype.slice.call(this);
                    const validatedItems = items.map((item, i) => vd.runValidate(conf.values, item, `${path}[${i}]`, false));
                    const result = validatedItems.concat(curr);
                    for (let i = 0; i < this.length; i++)
                        delete this[i];
                    for (let i = 0; i < result.length; i++)
                        Object.defineProperty(this, `${i}`, { value: result[i], writable: false, enumerable: true, configurable: true });
                    this.length = result.length;
                    return this.length;
                },
                enumerable: false
            });
            Object.defineProperty(toReturn, 'splice', {
                value: function (start, deleteCount, ...items) {
                    const curr = Array.prototype.slice.call(this);
                    const len = curr.length;
                    const s = start < 0 ? Math.max(len + start, 0) : Math.min(start || 0, len);
                    const dc = deleteCount === undefined ? len - s : Math.max(0, Math.min(deleteCount, len - s));
                    const validatedItems = items.map((item, i) => vd.runValidate(conf.values, item, `${path}[${s + i}]`, false));
                    const result = curr.slice(0, s).concat(validatedItems).concat(curr.slice(s + dc));
                    const deleted = curr.slice(s, s + dc);
                    for (let i = 0; i < this.length; i++)
                        delete this[i];
                    for (let i = 0; i < result.length; i++)
                        Object.defineProperty(this, `${i}`, { value: result[i], writable: false, enumerable: true, configurable: true });
                    this.length = result.length;
                    return deleted;
                },
                enumerable: false
            });
            Object.defineProperty(toReturn, 'concat', {
                value: function (...arrays) {
                    const curr = Array.prototype.slice.call(this);
                    let result = curr;
                    for (const arr of arrays) {
                        if (!Array.isArray(arr))
                            throw buildError(ValueError, 'Can only concat arrays to validated array properties.', this.validateType, path, null, value, "INVALID_CONCAT_VALUE");
                        const validatedItems = arr.map((item, i) => vd.runValidate(conf.values, item, `${path}[${result.length + i}]`, false));
                        result = result.concat(validatedItems);
                    }
                    return result;
                },
                enumerable: false
            });
        }
        else if (conf.type === Object && conf.keys) {
            const obj = {};
            for (const childKey in conf.keys)
                this.runValidate(conf.keys[childKey], value[childKey], `${path}.${childKey}`, isNew, obj, childKey);
            toReturn = obj;
        }
        else
            toReturn = value;
        const p = path.match(/[^.[\]]+/g)?.reduce((o, key) => o?.[key], this);
        if (conf.immutable && !isNone(p) && p !== toReturn)
            throw buildError(ImmutablePropertyError, `Cannot update immutable property '${path}'`, this.constructor.name, path, null, value, "IMMUTABLE_PROPERTY_UPDATE");
        if (typeof conf.validate === "function")
            conf.validate(toReturn);
        if (propertyName !== undefined) {
            let currentValue = toReturn;
            delete container[propertyName];
            Object.defineProperty(container, propertyName, {
                get: () => currentValue,
                set: (newVal) => {
                    const ctor = this.constructor;
                    if (ctor.immutable)
                        throw buildError(ImmutableObjectError, `Cannot update immutable object of type ${ctor.name}`, ctor.name, path, null, value, "IMMUTABLE_PROPERTY_UPDATE");
                    this.runValidate(conf, newVal, path, false, container, propertyName);
                },
                enumerable: true,
                configurable: true,
            });
        }
        return toReturn;
    }
    validateType(conf, value, path) {
        if (conf.beforeChecks && typeof conf.beforeChecks === "function") {
            const newVal = conf.beforeChecks(value);
            if (!isNone(newVal) || conf.optional)
                value = newVal;
        }
        if (isNone(value)) {
            if (!isNone(conf.default))
                value = typeof conf.default === 'function' ? conf.default() : conf.default;
            if (isNone(value)) {
                if (conf.optional)
                    return { conf, value };
                if (!conf.optional)
                    throw buildError(RequiredError, `Missing required property at '${path}'`, this.validateType, path, null, value, "REQUIRED_PROPERTY_MISSING");
            }
        }
        if (value.constructor !== conf.type) {
            // Attempt to coerce the value to the correct type if possible. Valuable for date strings from a json for example
            if (conf.coerce)
                value = new conf.type(value);
            if (value.constructor !== conf.type || isNaN(value))
                throw buildError(TypeValidationError, `Invalid type at '${path}', expected ${conf.type.name}, got ${value.constructor.name}`, this.constructor.name, path, null, value, "INVALID_TYPE");
        }
        if ((conf.max !== undefined) && (value.length ? value.length > conf.max : value > conf.max))
            throw buildError(RangeError, `Value too large for '${path}', maximum: ${conf.max}`, this.validateType, path, null, value, "VALUE_TOO_LARGE");
        if ((conf.min !== undefined) && (value.length ? value.length < conf.min : value < conf.min))
            throw buildError(RangeError, `Value too small for '${path}', minimum: ${conf.min}`, this.validateType, path, null, value, "VALUE_TOO_SMALL");
        if (conf.enum && !conf.enum.includes(value))
            throw buildError(EnumValueError, `Invalid value for '${path}', expected one of: ${conf.enum.join(", ")}`, this.validateType, path, null, value, "INVALID_ENUM_VALUE");
        if (conf.afterChecks && typeof conf.afterChecks === "function") {
            const newVal = conf.afterChecks(value);
            if (!isNone(newVal) || conf.optional)
                value = newVal;
        }
        return { conf, value };
    }
}
