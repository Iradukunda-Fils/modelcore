import { Base, ValueError, ImmutableObjectError, SchemaDefinitionError } from "../index.js";
// ==================== HELPER FUNCTIONS ====================
export function isNone(that) { return that === undefined || that === null; }
export function buildError(errorType, message, source, path, expected, received, code) {
    return new errorType({ message, source, path, expected, received, code });
}
export function normalizeConf(conf, path) {
    if (typeof conf === "function")
        return { type: conf };
    if (conf && typeof conf === "object" && 'type' in conf && conf.type && typeof conf.type === "function")
        return conf;
    throw buildError(SchemaDefinitionError, `Invalid schema definition for '${path}'`, Base, path, Object, conf, "SCHEMA_DEFINITION_ERROR");
}
// ==================== PROXY HANDLER ====================
export function createProxyHandler(ctor) {
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
export function createArrayHandler(vd, confValues, path) {
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
export function createSetHandler(vd, confValues, path) {
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
export function createMapHandler(vd, conf, path) {
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
export function createObjectHandler(vd, conf, path) {
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
            return true;
        },
    };
}
