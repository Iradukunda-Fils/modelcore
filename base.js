function isNone(that) { return that === undefined || that === null; }
export default class Base {
    constructor(obj, parseConfig) {
        this.update(obj, parseConfig, true);
    }
    static createFrom(obj, // Partial allows missing optional keys on input
    parseConfig) {
        return new this(obj, parseConfig);
    }
    update(obj, parseConfig, isNew = false) {
        const ctor = this.constructor;
        try {
            this.setProperties(ctor.schema, obj, isNew);
            if (ctor.version)
                this["version"] = ctor.version;
        }
        catch (e) {
            for (const key in Object.keys(this))
                this[key] = e; // This will make all properties of the object return the error when accessed, signaling that the object is in an invalid state due to failed validation
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
            throw new Error(`Cannot update immutable object of type ${ctor.name}`);
        if (!isNew)
            data = { ...this, ...data };
        for (const key in schema) {
            const conf = schema[key];
            let value = data[key];
            if (!conf)
                throw new Error(`'${key}' has no schema. Either remove it from the schema definition or add a schema for it.`);
            this.runValidate(conf, value, key, isNew, this, key);
        }
    }
    runValidate(confPassed, valuePassed, path, isNew, container = this, propertyName) {
        const { conf, value } = this.validateType(confPassed, valuePassed, path);
        let toReturn;
        if (conf.type === Array) {
            if (!conf.values)
                throw new Error(`Missing array value configuration at ${path}`);
            toReturn = [];
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
            // Monkey-patch the dangerous methods to rebuild the internal indexed props
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
                    throw new Error(`Array.fill() is not allowed on validated arrays. Use Array.splice() instead for controlled modifications.`);
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
            throw new Error(`Cannot update immutable property '${path}'`);
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
                        throw new Error(`Cannot update immutable object of type ${ctor.name}`);
                    this.runValidate(conf, newVal, path, false, container, propertyName);
                },
                enumerable: true,
                configurable: true,
            });
        }
        return toReturn;
    }
    validateType(conf, value, path) {
        if (!conf.type)
            throw new Error(`Missing type configuration at '${path}'`);
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
                    throw new Error(`Missing required property at '${path}'`);
            }
        }
        if (value.constructor !== conf.type) {
            // Attempt to coerce the value to the correct type if possible. Valuable for date strings from a json for example
            if (conf.coerce)
                value = new conf.type(value);
            if (value.constructor !== conf.type || isNaN(value))
                throw new Error(`Invalid type at '${path}', expected ${conf.type.name}, got ${value.constructor.name}`);
        }
        if ((conf.max !== undefined) && (value.length ? value.length > conf.max : value > conf.max))
            throw new Error(`Value too large for '${path}', maximum: ${conf.max}`);
        if ((conf.min !== undefined) && (value.length ? value.length < conf.min : value < conf.min))
            throw new Error(`Value too small for '${path}', minimum: ${conf.min}`);
        if (conf.enum && !conf.enum.includes(value))
            throw new Error(`Invalid value for '${path}', expected one of: ${conf.enum.join(", ")}`);
        if (conf.afterChecks && typeof conf.afterChecks === "function") {
            const newVal = conf.afterChecks(value);
            if (!isNone(newVal) || conf.optional)
                value = newVal;
        }
        return { conf, value };
    }
}
