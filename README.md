# ModelCore - Runtime Entity Integrity for JavaScript and TypeScript

A lightweight runtime schema validator for JavaScript and TypeScript models with support for immutability, field-level validation hooks, and TypeScript-friendly ergonomics.

`@bufferpunk/modelcore` is built around a `Base` class that validates plain objects using a static `schema` definition. It is useful when working with NoSQL data, API payloads, and nested objects that need runtime guarantees and constraints.

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

This package now also provides a typed factory pattern (`createFrom`) and improved TypeScript mappings so editors receive useful type information and inferred instance types when schemas are declared with `as const`.

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

const user = User.createFrom({ name: '   Ana   Silva   ' });
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
  tags: [String]
} as const satisfies SchemaDefinition;

class User extends Base {}
User.schema = userSchema;

// typed factory; the instance type is inferred from the schema
const u = User.createFrom({ id: 1, email: new Email("a@b.com"), name: "A", tags: ["x"] });

u.email = new Email("b@c.com"); // typescript will enforce that this is an Email instance
```

## Field Configuration

Each field in a schema can include:

- `type` (required): constructor such as `String`, `Number`, `Boolean`, `Date`, `Array`, `Object` or custom classes and types
- `optional`: allows missing value
- `default`: fallback value when input is `null` or `undefined` (function values are executed)
- `enum`: list of allowed values
- `min`, `max`: length constraints for values with a `length` property
- `immutable`: prevent this field from being changed after creation
- `beforeChecks(value)`: transforms/sanitizes raw input before required/type checks
- `afterChecks(value)`: transforms value after type/length/enum checks and before validation
- `validate(value)`: custom final validation logic
- `values`: required for `Array` types to validate each array item
- `keys`: required for `Object` types to validate nested properties

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

Use the `update()` method or regular property assignment to modify instance properties.
The constructor automatically includes the `version` if defined on the class.

```ts
const user = new User({ name: 'John', role: 'user' });
user.update({ role: 'admin' });
user.name = 'Jane'; // also works, with validation (eassiest for simple updates)
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
