# Runtime Entity Integrity Manifesto

Most systems treat data as something that is validated once and then forgotten.

That assumption is wrong.

Software is not a pipeline from input → output.
Software is a living system of state that continuously changes.

And once state is no longer governed, it doesn't stay still.

It drifts.

---

## The Principle

State must remain governed.

Not at the boundary.
Not at creation.
Not at ingestion.

But continuously — for as long as it exists.

---

## The Problem With Current Systems

Most libraries assume this lifecycle:

1. Validate input
2. Produce object
3. Forget rules

From that point on, the object is unprotected.

It can be mutated freely.
It can drift silently.
It can become invalid without warning.

The system only cares about correctness once.

That is not enough.

---

## The Core Claim

> A runtime entity is an object whose rules are inseparable from its state.

That means:

- validation is continuous
- coercion is automatic
- immutability is enforced at runtime
- business rules are always active
- nested structures remain governed

Every assignment is a transition.
Every transition is evaluated.

Nothing is assumed safe.

---

## The Missing Layer

Modern reactive frameworks answer: *what changed?*

But they do not answer: *should that change have happened?*

Reactivity tracks mutation.
Entity integrity governs it.

These are not the same thing.
Both are necessary.
Only one exists.

---

## Why Boundary Validation Is Not Enough

Boundary validation assumes data enters once and state stays stable afterward.

Real systems do not behave that way.

State is shared across layers. Mutated by multiple actors. Persisted and rehydrated. Transported across services. Cached and recomputed.

Validation at the edge cannot protect a moving system.

By the time invalid state surfaces, it has already spread.
By the time it's visible, it's too late to reason about where it broke.

---

## The Runtime Entity Model

A runtime entity is not a value.

It is a governed object lifecycle.

Rules travel with the object. They do not stop applying after creation.

```typescript
const user = new User({ id: '123', age: '20' });

user.age = '30'; // coerced and validated
user.id = '999'; // rejected — immutable
```

The entity remains consistent across time, not just at the moment it was born.

---

## Shared Truth Across Boundaries

The same entity can exist across frontend state, backend services, APIs, workers, caches, and databases.

And it behaves consistently everywhere.

There is no safe zone where rules disappear.
There is no layer where the object becomes a liability.

The schema is the contract.
The contract travels.

---

## What This Is Not

This is not just a schema validator.
This is not just a parsing library.
This is not just a state manager.
This is not a reactive framework.

Those tools operate *around* data.

This system operates on the *lifecycle* of data.

---

## The Line

If an object can become invalid after creation, it is not an entity.

It is data with temporary constraints.

This system exists to eliminate that distinction.

State should not lose its rules.
Not partially.
Not optionally.
Not eventually.

If it represents a domain concept, it should be valid for as long as it exists.

That is the only standard worth building to.
