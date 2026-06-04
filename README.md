# ModelCore - Runtime Entity Integrity for JavaScript and TypeScript

![Build Status](https://img.shields.io/github/actions/workflow/status/bufferpunk/schema/ci.yml?branch=main)
![Coverage](https://img.shields.io/badge/coverage-100%25-green)
![npm version](https://img.shields.io/npm/v/@bufferpunk/modelcore)
![License](https://img.shields.io/npm/l/@bufferpunk/modelcore)

**Pydantic-inspired • Lightweight • Backend & Frontend friendly**

A blazing fast, lightweight and Reactive Class-Based Object Modeling framework.

Build clean, safe, and delightful domain entities for TypeScript and JavaScript.

`@bufferpunk/modelcore` is built around a `Base` class that validates plain objects using a static `schema` definition. It is useful when working with NoSQL data, API payloads, and nested objects that need runtime and compile-time guarantees and constraints.

## What It Does

When a model extends `Base` and defines a static `schema`, instance creation and updates will:

- enforce required fields
- apply defaults (primitive values or factory functions)
- coerce values to the configured type when possible
- validate nested objects and arrays recursively
- validate allowed values with `enum`
- run custom `beforeChecks` and `afterChecks` hooks if present
- run custom `validate` hook for final validation if present
- enforce immutability at class or field level
- support typed unions with `Union(...)`

This package now also provides a typed factory pattern (`createFrom`) and improved TypeScript mappings so editors receive useful type information and inferred instance types when schemas are declared with `as const`.

## Comparison to Other Libraries

- **Zod / Joi / Yup**: These are schema validation libraries that focus on validating plain objects. They do not provide a class-based model with runtime immutability or automatic coercion. You would need to manually validate and then assign values to a class instance.
- **TypeORM / Sequelize**: These are ORM libraries that provide class-based models but are tightly coupled to databases and do not focus on runtime validation or immutability outside of the context of database operations.
- **MobX / Vue Reactivity**: These libraries provide reactivity and state management but do not enforce validation rules or immutability at the runtime level. They track changes but do not govern them.

**ModelCore** fills the gap by providing a class-based modeling system that enforces validation and immutability rules at runtime and compile-time, making it suitable for both frontend and backend applications where data integrity is crucial.

**Here is a simple comparison with other libraries**

| Feature                     | ModelCore                 | Zod / Joi / Yup           | TypeORM / Sequelize       | MobX / Vue Reactivity    |
|-----------------------------|---------------------------|---------------------------|---------------------------|--------------------------|
| Class-based models          | ✅                        | ❌                        | ✅                         | ❌                         |
| Runtime validation          | ✅                        | ✅                        | Limited (database-focused) | ❌                         |
| Reactivity                  | ✅                        | ❌                        | ❌                         | ✅                         |
| Immutability enforcement    | ✅                        | ❌                        | Limited (database-focused) | ❌                         |
| Automatic coercion          | ✅                        | Limited (Zod has some coercion) | ❌                         | ❌                         |
| Nested object validation    | ✅                        | ✅                        | Limited (database-focused) | ❌                         |
| TypeScript support          | ✅                        | ✅                        | ✅                         | ✅                         |
| Frontend & Backend friendly | ✅                        | ✅                        | Backend-focused            | Frontend-focused           |

## Installation

```bash
npm install @bufferpunk/modelcore
```

## Quick Start (JavaScript)

```js
import Base from "@bufferpunk/modelcore"; // in ESM environments
// or const Base = require("@bufferpunk/modelcore").default; // in CommonJS environments

class User extends Base {
  static version = 1;
  static schema = {
    name: {
      type: String,
      min: 2,
      max: 80,
      beforeChecks: (value) => typeof value === "string" ? value.trim() : value,
      afterChecks: (value) => value.replace(/\s+/g, " ")
    },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      default: "viewer",
      beforeChecks: (value) => typeof value === "string" ? value.toLowerCase() : value
    },
    confirmed: { type: Boolean, optional: true, default: false }
  };
}

const user = new User({ name: "   John    Doe   ", role: "EDITOR" });
console.log(user);
```

## Quick Start (TypeScript)

```ts
import Base, { SchemaDefinition } from '@bufferpunk/modelcore';

class User extends Base {
  static version = 1;

  static schema = {
    name: {
      type: String,
      min: 2,
      max: 80,
      beforeChecks: (value: any) => typeof value === 'string' ? value.trim() : value,
      afterChecks: (value: any) => value.replace(/\s+/g, ' ')
    },
    language: {
      type: String,
      enum: ['english', 'spanish', 'portuguese'],
      default: 'english',
      beforeChecks: (value: any) => typeof value === 'string' ? value.toLowerCase().trim() : value,
      afterChecks: (value: any) => value.charAt(0).toUpperCase() + value.slice(1)
    }
  } as const satisfies SchemaDefinition;
}

const user = User.createFrom({ name: '   Ana   Silva   ' }); // creatFrom() is a factory function for better TypeScript type hints and inference
console.log(user);
```

## Custom Types / Classes
You can use custom classes as field types. The system will validate that the value is an instance of the class and run its constructor logic.

```ts
import Base, { SchemaDefinition } from "@bufferpunk/modelcore";

class Email {
  constructor(public value: string) {
    if (typeof value !== "string" || !/^\S+@\S+\.\S+$/.test(value)) {
      throw new Error("Invalid email format");
    }
  }
}

const userSchema = {
  id: Number,
  email: Email,
  name: String,
  tags: { type: Array, values: String } // all values of this array will be strings
} as const satisfies SchemaDefinition;

class User extends Base {}
User.schema = userSchema;

// typed factory; the types are inferred from the schema
const u = User.createFrom({ id: 1, email: new Email("a@b.com"), name: "A", tags: ["x"] });

u.email = new Email("b@c.com"); // typescript and ModelCore will enforce that this is an Email instance
```

## Union Types

Use `Union(...)` to define a field that accepts multiple constructor types while preserving TypeScript inference.

```ts
import Base, { SchemaDefinition, Union } from "@bufferpunk/modelcore";

class User extends Base {
  static schema = {
    identifier: Union(String, Number),
    contact: {
      type: Object,
      keys: { // you can also use `properties`
        email: String,
        phone: { type: String, optional: true }
      }
    }
  } as const satisfies SchemaDefinition;
}

const user = User.createFrom({ identifier: "123", contact: { email: "a@b.com" } });
```

`Union` can also combine custom classes and primitives:

```ts
class Email extends String {
  constructor(value: string) {
    super(value);
  }
}

class User extends Base {
  static schema = {
    contact: Union(String, Email)
  } as const satisfies SchemaDefinition;
}
```

## Field Configuration

Each field in a schema can include:

- `type` (required): constructor such as `String`, `Number`, `Boolean`, `Date`, `Array`, `Object` or custom classes and types. Nested object and array schemas can also use shorthand constructors directly inside `keys` and `values`.
- `optional`: allows missing value
- `required`: alias for `optional: false` (can be used for clearer schema intent)
- `default`: fallback value when input is `null` or `undefined` (function values are executed)
- `enum`: list of allowed values
- `min`, `max`: length constraints for values with a `length` property
- `immutable`: prevent this field from being changed after creation
- `beforeChecks(value)`: transforms/sanitizes raw input before required/type checks
- `afterChecks(value)`: transforms value after type/length/enum checks and before validation
- `validate(value)`: custom final validation logic
- `values`: required for `Array` types to validate each array item
- `keys` / `properties`: required for `Object` types to validate nested properties

The `type` property is the only required configuration for a field. All other properties are optional and can be used as needed to enforce constraints and transformations.

## Validation Order

For each field, validation runs in this order:

1. `beforeChecks`
2. required/optional and default handling
3. type validation/coercion
4. `min` / `max`
5. `enum`
6. `afterChecks`
7. custom `validate`
8. immutability check

## Immutability

Mark classes or individual fields as immutable to prevent modifications.

```ts
class ImmutableUser extends Base {
  static immutable = true;
  static schema: SchemaDefinition = {
    id: { type: String, immutable: true },
    name: { type: String }
  };
}
```

## Updating Instances

Use regular property access (recommended) to modify instance properties or the `update()` method (best if you want to update the whole object).
The constructor automatically includes the `version` if defined on the class.

```ts
const user = new User({ name: 'John', role: 'user' });
user.name = 'Jane'; // (easiest and recommended for simple property changes)
user.update({ name: 'Jane', role: 'admin' });
```

## Factory and TypeScript ergonomics

Prefer defining schemas with `as const` and using the `createFrom` factory to get type inference for instance shapes without duplicating declarations.

```ts
const userSchema = {
  id: Number,
  email: String,
  name: String
} as const satisfies SchemaDefinition;

class User extends Base {}
User.schema = userSchema

const instance = User.createFrom({ id: 1, email: 'a@b.com', name: 'A' })
```

## Nested Objects and Arrays

Use `keys` for objects and `values` for arrays. See the examples for full patterns.

## Included Files

- `base.ts` / `base.js` / `base.d.ts`: base validator implementation
- `examples/*`: runnable examples demonstrating inheritance, factory usage, and custom types
- `test/*`: test suite covering all behaviors

## Migration from @bufferpunk/schema

See [CHANGELOG.md](CHANGELOG.md) for breaking changes and migration steps.

## Testing & CI

Run tests with Node's test runner:

```bash
npm run build
npm test
```

The repository includes a GitHub Actions workflow to run build and test on Node LTS.

## Benchmarking

Use the included micro-benchmark to compare construction, factory creation, updates, and mutation paths:

```bash
npm run bench
```

You can adjust iteration count with `BENCH_ITERATIONS`:

```bash
BENCH_ITERATIONS=100000 npm run bench
```

Example result on this repository, run with `BENCH_ITERATIONS=100000`:


│ (index) │ Benchmark                                        │ Time (ms) │ Ops/sec |
|---------|--------------------------------------------------|-----------|---------|
│ 0       │ 'construct + validate'                           │ 1166      │ 85781   |
│ 1       │ 'createFrom factory'                             │ 1080      │ 92620   |
│ 2       │ 'construct + validate + update validated fields' │ 2661      │ 46729   |
│ 3       │ 'construct + validate + array mutations'         │ 2845      │ 48088   |


The benchmark is intentionally small and repeatable. It is useful for comparing changes between commits, not for replacing a full profiler or load test.

## Why Runtime Entities Matter

See the manifesto for the project's goals and positioning: [manifesto.md](manifesto.md)

## Notes

This package is intentionally small and framework-agnostic. It gives you runtime schema safety, immutability constraints, and field-level validation without requiring an ORM or heavyweight validation framework.

## Contributing & Design Notes

- Keep schemas as the single source of truth. Prefer `createFrom` for type inference and one-source-of-truth behavior.
- This library is intentionally small and framework-agnostic: no runtime dependencies and minimal conceptual overhead.
- For TypeScript ergonomics, prefer `as const` and named type aliases when you need concise editor hovers.
- See the manifesto for the project's goals and positioning: [manifesto.md](manifesto.md)

## License

MIT
