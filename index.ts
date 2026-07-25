export {
  type FieldConfig,
  type SchemaDefinition,
  type SchemaToType,
  type BaseConstructor,
  type errorObject,
  type parserConfig,
  ModelCoreUnion,
  Union
} from "./src/typing.js";

export {
  ModelCoreError,
  ImmutableObjectError,
  ImmutablePropertyError,
  ValidationError,
  EnumValueError,
  RangeError,
  TypeValidationError,
  MissingPropertyError,
  SchemaDefinitionError,
  RequiredError,
  ValueError
} from "./src/errors.js";

export {
  buildError,
  normalizeConf,
  isNone,
  createProxyHandler,
  createArrayHandler,
  createSetHandler,
  createMapHandler,
  createObjectHandler
} from "./src/utils.js";

import Base from "./src/base.js";

export { Base }

