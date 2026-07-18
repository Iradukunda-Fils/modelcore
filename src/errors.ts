import { type errorObject } from "../index.js";

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


export function parsePath(path: string | undefined): Array<string | number> {
  const parts: Array<string | number> = [];
  path?.replace(/[^.[\]]+/g, (match) => {
    if (/^\d+$/.test(match)) parts.push(Number(match));
    else parts.push(match);
    return "";
  });
  return parts;
}

