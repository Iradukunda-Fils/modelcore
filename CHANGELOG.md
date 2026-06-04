# CHANGELOG

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-06-04

### Added
- `Union(...)` helper for typed union schema fields and runtime validation.
- support shorthand constructors inside nested `keys` and `values`, so nested fields like `make: String` work naturally.
- `required` alias support for `optional: false` and clearer required-field intent.
- `properties` alias support for `Object` field schemas in addition to `keys`.

### Changed
- improved TypeScript inference for union fields and nested schema shorthand.
- updated README and docs with union support and nested shorthand examples.

### Fixed
- corrected schema typings so `Union(String, Number)` behaves correctly with `createFrom` and compile-time inference.

## [1.1.0] - 2026-06-02

### Added
- Rich and detailed error handling with descriptive error classes to enable programmatic error handling and clearer error semantics.

### Changed
- Removed redundant checks
- Fixed loop on error thrown during construction to properly set all properties to the error object instead of just the enumerable ones.

### Notes
- These changes improve runtime safety and the test coverage baseline; see tests in `test/base.test.js` for usage patterns.

## [1.0.0] - 2024-06-30
- Project renamed from `@bufferpunk/schema` to `@bufferpunk/modelcore` to better reflect its focus on runtime entities and validation rather than just schema definition.
- Improve TypeScript ergonomics: recommend `as const` schemas and provide `createFrom` factory for single-source-of-truth typed instantiation.
- Map runtime constructors (including custom classes) to instance types for better editor hovers and instance validation.
- Harden array behavior: non-writable index properties, guarded `push`/`unshift`/`splice` that validate items, and forbid `fill` to maintain integrity.
- Preserve schema literal types and avoid broad index signatures that produced `any` in editor hovers.
- Expand test coverage: added/merged comprehensive tests covering arrays, immutability, nested validation, defaults, and custom types.
- Add GitHub Actions CI workflow to run build, tests, and coverage.
- Rewrite README to focus on technical usage and TypeScript guidance; extract manifesto into `manifesto.md` for positioning and goals.
- `createFrom()` factory for typed model instantiation from static `schema`.
- Improved TypeScript mapped types to infer instance shapes from `schema` definitions when used with `as const`.
- Custom constructor handling so class types (e.g., `Email`) map to their instances at the type level and are validated at runtime.
- Extensive tests covering mutation semantics and validation rules.
- `.github/workflows/ci.yml` to run build and tests on push/PR.

### Fixed
- Fixed array mutation edge-cases (splice/delete-only behavior) and ensured index descriptors are rebuilt after guarded mutations.
- Removed class-level coerce which is dangerous and not commonly needed; coercion should be opt-in per field or via constructor config.

## Migration notes
- Install the new package: `npm install @bufferpunk/modelcore`
- Update imports from `@bufferpunk/schema` to `@bufferpunk/modelcore`
- If using TypeScript, update schema definitions to use `as const satisfies SchemaDefinition` for better type inference, and use the `createFrom` factory method for instantiation to get typed instances.
- Review the new README and manifesto for updated usage patterns and design philosophy.

## [3.1.0] - 2026-05-12

### ⚠️ Breaking Changes

- **Immutability error messages**: Error message wording changed for consistency
  ```
  // Before: "Cannot change immutable property 'name'"
  // After: "Cannot update immutable property 'name'"
  ```

- **Property setter enforcement**: Class-level immutability now prevents direct property assignment (not just `.update()`)
  ```ts
  class ImmutableUser extends Base {
    static immutable = true;
    static schema = { name: { type: String } };
  }
  
  const user = new ImmutableUser({ name: "John" });
  user.name = "Jane"; // Error: Cannot update immutable object of type ImmutableUser
  ```

### ✨ New Features

- **`json()` method**: Serialize instance to JSON string
  ```ts
  const user = new User({ name: "John" });
  const jsonStr = user.json();
  ```

- **`parseConfig` parameter**: Pass `coerce` and `safe` options to constructor and `.update()`
  ```ts
  // Coerce string to Date on construction
  const user = new User({ createdAt: "2020-01-01" }, { coerce: true });
  
  // Silently ignore validation errors during construction
  const user = new User({}, { safe: true });
  ```

- **Property setter validation**: Direct property assignment now validates and revalidates values
  ```ts
  const user = new User({ name: "John" });
  user.name = "  Jane  "; // Runs beforeChecks/afterChecks hooks
  ```

- **Fixed nested object property leak**: Nested `keys` properties now correctly attach to their parent object, not the root instance

### 🐛 Bug Fixes

- Property setters now persist validated values instead of discarding them
- Nested object child properties no longer leak to the root object during initialization
- Immutability is now enforced on direct property assignment (not just `.update()`)

## [3.0.0] - 2026-05-06

### ⚠️ Breaking Changes

- **Constructor signature changed**: Removed `addVersion` parameter from constructor. Version is now automatically included if `static version` is defined on the class.
  ```ts
  // Before
  new User(data, true);
  
  // After
  new User(data);
  ```

- **Hook names renamed**:
  - `beforeValidate` → `beforeChecks`
  - `afterValidate` → `afterChecks`

- **Array field config changed**: `child` → `values`
  ```ts
  // Before
  cars: { type: Array, child: { type: Object, children: { ... } } }
  
  // After
  cars: { type: Array, values: { type: Object, keys: { ... } } }
  ```

- **Object field config changed**: `children` → `keys`
  ```ts
  // Before
  address: { type: Object, children: { street: {...}, city: {...} } }
  
  // After
  address: { type: Object, keys: { street: {...}, city: {...} } }
  ```

### ✨ New Features

- **Immutability support**: Mark fields or entire classes as immutable
  ```ts
  class ImmutableUser extends Base {
    static immutable = true; // entire class cannot be updated
    
    static schema = {
      id: { type: String, immutable: true }, // this field cannot change
      name: { type: String }
    };
  }
  ```

- **Update method**: Safely update instance properties after creation
  ```ts
  const user = new User({ name: 'John' });
  user.update({ name: 'Jane' }); // returns void, modifies instance
  ```

- **Better error messages**: Property paths now include quotes for clarity
  ```
  // Before: "Invalid value for address.street, expected one of: ..."
  // After: "Invalid value for 'address.street', expected one of: ..."
  ```

### 📝 Migration Guide

If upgrading from v2.x:

1. Replace all `beforeValidate` with `beforeChecks`
2. Replace all `afterValidate` with `afterChecks`
3. Replace all `child` with `values` in Array types
4. Replace all `children` with `keys` in Object types
5. Remove the second parameter from all constructor calls (version now auto-applies)
6. If using immutability, enable with `static immutable = true` or field-level `immutable: true`
7. For instance updates, use the new `update()` method instead of reassigning properties
