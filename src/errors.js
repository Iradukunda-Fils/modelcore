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
export function parsePath(path) {
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
