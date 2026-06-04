# ModelCore

**Runtime entity integrity for JavaScript and TypeScript.**

[![Build Status](https://img.shields.io/github/actions/workflow/status/bufferpunk/modelcore/ci.yml?branch=main)](https://github.com/bufferpunk/modelcore) [![Coverage](https://img.shields.io/badge/coverage-100%25-green)](https://github.com/bufferpunk/modelcore) [![npm version](https://img.shields.io/npm/v/@bufferpunk/modelcore)](https://npmjs.com/package/@bufferpunk/modelcore) [![License](https://img.shields.io/npm/l/@bufferpunk/modelcore)](https://github.com/bufferpunk/modelcore/blob/main/LICENSE)

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

---

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

For the best TypeScript experience, use `createFrom()` — it infers the instance shape from the schema without any duplication:

```typescript
const user = User.createFrom({ name: 'Ana Silva', role: 'admin' });
```

---

## What happens on every assignment

Validation runs in a deterministic order, every time — at creation and on every mutation:

1. `beforeChecks` — sanitize/transform raw input
2. Required / optional / default resolution
3. Type validation and coercion
4. `min` / `max` constraints
5. `enum` check
6. `afterChecks` — post-type transformation
7. Custom `validate` hook
8. Immutability check

Nothing is assumed safe after creation.

---

## Immutability

Mark a class or individual fields as immutable and ModelCore will enforce it at runtime — not just in TypeScript types.

```typescript
class Order extends Base {
  static immutable = true; // entire class is frozen after creation

  static schema = {
    id:     { type: String, immutable: true }, // or field-level
    total:  { type: Number }
  } as const satisfies SchemaDefinition;
}

const order = new Order({ id: 'ord_123', total: 49.99 });
order.total = 99.99; // throws
```

---

## Nested objects and arrays

```typescript
class Post extends Base {
  static schema = {
    title: { type: String, min: 1, max: 200 },
    tags:  { type: Array, values: String },
    author: {
      type: Object,
      keys: {
        name:  String,
        email: String
      }
    }
  } as const satisfies SchemaDefinition;
}
```

Nested structures are validated recursively. The same rules apply at every level.

---

## Custom types

Any class can be a field type. ModelCore will validate that the value is an instance and run its constructor logic.

```typescript
class Email {
  constructor(public value: string) {
    if (!/^\S+@\S+\.\S+$/.test(value)) throw new Error('Invalid email');
  }
}

class User extends Base {
  static schema = {
    email: Email,
    name:  String
  } as const satisfies SchemaDefinition;
}
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
```

`Union` works with custom classes and primitives alike.

---

## Updating instances

```typescript
const user = new User({ name: 'John', role: 'editor' });

user.name = 'Jane';                        // direct assignment, validated
user.update({ name: 'Jane', role: 'admin' }); // batch update
```

---

## Performance

ModelCore is fast enough for hot paths. On 100k iterations:

| Operation | Ops/sec |
|---|---|
| `construct + validate` | ~85,800 |
| `createFrom` factory | ~92,600 |
| `construct + validate + update` | ~46,700 |
| `construct + validate + array mutations` | ~48,100 |

Run the included benchmark yourself:

```bash
npm run bench
# or: BENCH_ITERATIONS=100000 npm run bench
```

---

## Design philosophy

ModelCore is intentionally small. No runtime dependencies. No framework coupling. No database opinions.

The schema is the single source of truth. Rules don't stop applying after creation — they travel with the object for as long as it exists.

For the full thinking behind this: [manifesto.md](./manifesto.md)

---

## Testing

```bash
npm run build
npm test
```

100% coverage. CI runs on Node LTS.

---

## Migration from `@bufferpunk/schema`

See [CHANGELOG.md](./CHANGELOG.md).

---

## License

MIT
