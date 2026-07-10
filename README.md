# ModelCore

**Runtime entity integrity for JavaScript and TypeScript.**

[![Build Status](https://img.shields.io/github/actions/workflow/status/bufferpunk/modelcore/ci.yml?branch=main)](https://github.com/bufferpunk/modelcore) [![Coverage](https://img.shields.io/badge/coverage-96%25-green)](https://github.com/bufferpunk/modelcore) [![npm version](https://img.shields.io/npm/v/@bufferpunk/modelcore)](https://npmjs.com/package/@bufferpunk/modelcore) [![License](https://img.shields.io/npm/l/@bufferpunk/modelcore)](https://github.com/bufferpunk/modelcore/blob/main/LICENSE)

---

Most validation libraries protect the boundary. They check data when it arrives, then step aside.

ModelCore does something different: **it stays**.

Once you define a schema, the rules travel with the object — through mutations, reassignments, nested updates, and transport. An invalid state can't sneak in after creation. Your entities mean what they say, always.

> *Pydantic-inspired • Zero dependencies • Frontend & backend*

---

## Why this gap exists

You probably already use Zod, Joi, or Yup. They're great at what they do: validate a plain object at a boundary, then hand it off. But once the object leaves the validator, the rules are gone. The object can drift. It can become invalid silently.

TypeORM and Sequelize give you class-based models, but they're coupled to databases. MobX and Vue reactivity track *what* changed — but not *whether that change should have happened*.

ModelCore fills the gap none of them cover:

| Feature | ModelCore | Zod / Joi / Yup | TypeORM / Sequelize | MobX / Vue |
|---|---|---|---|---|
| Class-based models | ✅ | ❌ | ✅ | ❌ |
| Runtime validation | ✅ | ✅ | Limited | ❌ |
| Continuous enforcement | ✅ | ❌ | ❌ | ❌ |
| Immutability enforcement | ✅ | ❌ | Limited | ❌ |
| Automatic coercion | ✅ | Limited | ❌ | ❌ |
| Nested object validation | ✅ | ✅ | Limited | ❌ |
| Zero dependencies | ✅ | ❌ | ❌ | ❌ |
| Frontend & backend | ✅ | ✅ | Backend only | Frontend only |


## Installation

```bash
npm install @bufferpunk/modelcore
```

---

## Quick start

```typescript
import Base, { SchemaDefinition } from '@bufferpunk/modelcore';

class User extends Base {
  static schema = {
    name: {
      type: String,
      min: 2,
      max: 80,
      beforeChecks: (v: any) => typeof v === 'string' ? v.trim() : v,
      afterChecks: (v: any) => v.replace(/\s+/g, ' ')
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'viewer',
      beforeChecks: (v: any) => typeof v === 'string' ? v.toLowerCase() : v
    },
    confirmed: { type: Boolean, optional: true, default: false }
  } as const satisfies SchemaDefinition;
}

const user = new User({ name: '   John    Doe   ', role: 'EDITOR' });
// → { name: 'John Doe', role: 'editor', confirmed: false }

user.role = 'SUPERUSER'; // throws — 'superuser' is not in enum
user.name = '  Jane  ';  // coerced and trimmed automatically
```

For the best TypeScript experience, use `Model.create()` or `Model.createFrom()` — it infers the instance shape from the schema without any duplication:

```typescript
const user = User.createFrom({ name: 'Ana Silva', role: 'admin' });
// or 
const user = User.create({ name: 'Ana Silva', role: 'admin' });
```

---

## Validation pipeline

Every assignment and construction runs through this exact sequence:

1. **`beforeChecks`** — sanitize/transform raw input (trim, lowercase, etc.)
2. **Required / optional / default resolution** — missing required fields throw; optional fields resolve to `undefined`; defaults are applied
3. **Type validation and coercion** — checks `value.constructor === conf.type`; optional `coerce: true` calls the constructor
4. **`min` / `max` constraints** — applies to `String.length` or numeric value
5. **`enum` check** — value must be in the allowed set
6. **`afterChecks`** — post-type transformation
7. **Custom `validate` hook** — arbitrary validation logic (throw to reject)
8. **Validation handlers** — registered middleware functions run in order — see [Validation handlers](#validation-handlers)
9. **`afterChecks`** — post-type transformation
10. **Custom `validate` hook** — arbitrary validation logic (throw to reject)
11. **Immutability check** — if the field or class is immutable, reject the mutation

---

## Schema reference

### `FieldConfig`

```typescript
interface FieldConfig {
  type: Function;                    // Constructor: String, Number, Boolean, Date, Array, Object, or custom class
  immutable?: boolean;               // Reject writes after construction
  optional?: boolean;                // Allow undefined
  required?: boolean;                // Alias for optional: false
  default?: any | (() => any);       // Default value (function = factory)
  enum?: any[];                      // Allowed values
  min?: number;                      // Min length (String) or min value (Number)
  max?: number;                      // Max length (String) or max value (Number)
  beforeChecks?: (value: any) => any; // Pre-validation transform
  afterChecks?: (value: any) => any;  // Post-validation transform
  validate?: (value: any) => void;    // Custom validation hook
  keys?: Record<string, FieldConfig | Function>; // Nested object schema
  properties?: Record<string, FieldConfig | Function>; // Alias for keys
  values?: FieldConfig | Function;    // Array item schema
  coerce?: boolean;                   // Auto-coerce via constructor
}
```

### Shorthand syntax

Any field value that is a constructor function (e.g., `String`, `Email`) is normalized to `{ type: thatFunction }`. So `name: String` is equivalent to `name: { type: String }`.

---

## Immutability

Mark a class or individual fields as immutable and ModelCore will enforce it at runtime — not just in TypeScript types.

```typescript
class Order extends Base {
  static immutable = true; // entire class is frozen after creation

  static schema = {
    id:     { type: String, immutable: true },
    total:  { type: Number }
  } as const satisfies SchemaDefinition;
}

const order = new Order({ id: 'ord_123', total: 49.99 });
order.total = 99.99; // throws ImmutableObjectError
```

Immutable fields lock their first value at construction. Immutable classes block all direct assignment and `.update()` calls after construction.

---

## Nested objects and arrays

```typescript
class Post extends Base {
  static schema = {
    title: { type: String, min: 1, max: 200 },
    tags:  { type: Array, values: { type: String, beforeChecks: v => v.trim() } },
    author: {
      type: Object,
      keys: {
        name:  String,
        email: { type: String, validate: v => { if (!v.includes('@')) throw Error('bad email'); } }
      }
    }
  } as const satisfies SchemaDefinition;
}

const post = new Post({
  title: 'Hello',
  tags: ['  one  ', '  two  '],   // items are trimmed
  author: { name: 'Alice', email: 'a@b.com' }
});

post.tags.push('  three  ');  // validated and trimmed
post.author.name = 'Bob';      // validated via nested proxy
```

Nested structures are wrapped in handlers that enforce the same rules. Array mutations (`push`, `unshift`, `splice`, `concat`, index assignment) are all validated. `fill()` is forbidden to prevent bulk silent corruption.

---

## Custom types

Any class can be a field type. ModelCore validates that the value is an instance of the class and runs its constructor logic during coercion.

```typescript
class Email {
  value: string;
  constructor(value: string) {
    if (!/^\S+@\S+\.\S+$/.test(value)) throw new Error('Invalid email');
    this.value = value;
  }
}

class User extends Base {
  static schema = {
    email: Email,
    name:  String
  } as const satisfies SchemaDefinition;
}

const user = new User({ email: 'alice@example.com', name: 'Alice' });
// user.email is an Email instance, validated at construction
```

---

## Validation handlers (middleware)

Register reusable validation logic that runs on **every field, every model, every time** — like a plugin system for the validation pipeline.

```typescript
import Base, { buildError, ValueError } from '@bufferpunk/modelcore';

// 1. Define a handler that reads custom config properties
function validateRegex(conf: any, value: any, path: string) {
  if (conf.regex && typeof value === 'string') {
    if (!conf.regex.test(value))
      throw buildError(ValueError,
        `Value does not match regex ${conf.regex}`,
        validateRegex, path, conf.regex, value, "INVALID_REGEX");
  }
}

// 2. Register it once — applies everywhere
Base.addValidationHandler(validateRegex);

// 3. Use custom properties in your field config (the index signature allows it)
class User extends Base {
  static schema = {
    name: {
      type: String,
      regex: /^[a-zA-Z\s]+$/,       // custom property, consumed by validateRegex
      beforeChecks: v => v.trim(),
    },
    nickname: {
      type: String,
      minWords: 2,                    // another custom property for a different handler
    },
  } as const satisfies SchemaDefinition;
}
```

Handler functions receive `(FieldConfig, value, path)` and are called **after** built-in checks (type, min/max, enum) and **before** `afterChecks`. Throw any `ModelCoreError` subclass (or a regular `Error`) to reject the value.

### Custom field config properties

Because `FieldConfig` includes `[key: string]: any`, you can attach arbitrary metadata to field definitions without TypeScript errors. This lets handlers carry their own configuration alongside the field:

```typescript
// Define handlers that read your custom properties
Base.addValidationHandler((conf, value, path) => {
  if (conf.minWords && typeof value === 'string') {
    const count = value.trim().split(/\s+/).length;
    if (count < conf.minWords)
      throw buildError(ValueError, `Must have at least ${conf.minWords} words`, ...);
  }
});

// Use them in schemas with zero boilerplate
class Article extends Base {
  static schema = {
    title:   { type: String, minWords: 3 },
    body:    { type: String, minWords: 50 },
    summary: { type: String, minWords: 1, optional: true },
  } as const satisfies SchemaDefinition;
}
```

### `buildError()` helper

To let handlers throw consistent, typed errors:

```typescript
import { buildError, ValueError } from '@bufferpunk/modelcore';

throw buildError(
  ValueError,             // Error class (any ModelCoreError subclass)
  "Human-readable message",
  myHandlerFunction,      // source
  "field.path",           // path
  "expected value",       // expected
  "received value",       // received
  "CUSTOM_ERROR_CODE"     // code
);
```

---

## Union types

```typescript
import Base, { SchemaDefinition, Union } from '@bufferpunk/modelcore';

class User extends Base {
  static schema = {
    identifier: Union(String, Number),
  } as const satisfies SchemaDefinition;
}

const a = new User({ identifier: 'abc' }); // OK
const b = new User({ identifier: 42 });     // OK
const c = new User({ identifier: true });   // throws — not String or Number
```

`Union` accepts any number of constructors (primitives or custom classes) and validates at runtime that the value matches one of them.

---

## Updating instances

```typescript
const user = new User({ name: 'John', role: 'editor' });

user.name = 'Jane';                        // direct assignment, validated
user.update({ name: 'Jane', role: 'admin' }); // bulk update, validated
```

`update()` performs a batch update — it iterates the schema and validates only the fields present in the data object. Fields not included in the update data are left untouched (no re-validation), making partial updates efficient.

---

## Construct / parse options

Pass a second argument to the constructor or `update()` to control behavior:

```typescript
// Coerce string values into their typed counterparts
class User extends Base {
  static schema = {
    name: String,
    createdAt: { type: Date, coerce: true, required: false }, // pass it in the field config.
  } as const satisfies SchemaDefinition;
}

// Silently swallow construction errors, marking fields with the error
const user = new User({ name: { not: 'valid' } }, { safe: true });
// user.name === Error (the caught error object)
```

---

## Error system

ModelCore throws typed error classes for every failure mode:

| Error class | Trigger |
|---|---|
| `ValidationError` | Custom `validate` hook throws |
| `TypeValidationError` | Value constructor doesn't match schema type |
| `RequiredError` | Required field is missing |
| `EnumValueError` | Value not in allowed enum set |
| `RangeError` | Value exceeds min/max |
| `ImmutableObjectError` | Write to immutable class |
| `ImmutablePropertyError` | Write to immutable field |
| `SchemaDefinitionError` | Malformed schema definition |
| `MissingPropertyError` | Nested required property missing |
| `ValueError` | Array method misuse (e.g., `fill()`) |

All errors extend `ModelCoreError`, which carries `source`, `path`, `expected`, `received`, and `code` properties for programmatic handling.

---

## Performance

ModelCore achieves **>380K ops/sec** across all operations on 100K iterations (Node 24) on a regular laptop:

| Operation | Ops/sec |
|---|---|
| `construct + validate` (5 fields incl. nested) | ~383K |
| `Model.create()` factory | ~383K |
| `batch update validated fields` (partial 3/5 fields) | ~399K |

This is comparable to the fastest validation libraries, while also providing continuous enforcement and nested object support. This is enabled by:

Run the included benchmark yourself:

```bash
BENCH_ITERATIONS=100000 npm run bench
```

---

## API reference

### `class Base`

```typescript
class Base {
  static schema: SchemaDefinition;
  static version?: number;
  static immutable?: boolean;
  static validationHandlers?: Array<Function>;

  constructor(obj: Record<string, any>, parseConfig?: parserConfig);

  static createFrom<T>(obj, parseConfig?): SchemaToType<T['schema']>;
  static create<T>(obj, parseConfig?): SchemaToType<T['schema']>;
  static addValidationHandler(handler: Function): void;

  update(obj: Record<string, any>, parseConfig?: parserConfig): void;
  toObject(): Record<string, any>;
  json(): string;
}
```

| Method | Description |
|---|---|
| `new Base(data, opts?)` | Creates and validates instance. Returns a Proxy. |
| `Model.createFrom(data, opts?)` | Factory — return type is inferred from schema. |
| `Model.create(data, opts?)` | Alias for `createFrom`. |
| `Base.addValidationHandler(handler)` | Register a middleware function `(conf, value, path) => void` run during every `validateType` call. |
| `instance.update(data, opts?)` | Batch/Bulk-update validated fields. |
| `instance.toObject()` | Returns a plain object with all current values. |
| `instance.json()` | To make things easier for you |

