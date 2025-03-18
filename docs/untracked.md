# Untracked API

The `untracked` function allows you to read signal values without creating dependencies. This is useful when you need to access a signal within an effect or computed value without causing them to re-run when that signal changes.

## Basic Usage

```typescript
import { signal, effect, untracked } from "@hellajs/reactive";

const count = signal(0);

effect(() => {
  // Access count without creating a dependency
  const value = untracked(() => count());
  console.log("Reading count:", value);

  // This effect won't re-run when count changes
});

// Updating count won't trigger the effect
count.set(1);
```

## Why Use Untracked?

When you access a signal inside an effect or computed value, a dependency is automatically created. Sometimes you want to read a signal's value without creating this dependency. Common use cases include:

1. Reading configuration values that shouldn't trigger re-computation
2. Conditional dependencies (deciding whether to track a signal based on some condition)
3. Performance optimization by avoiding unnecessary re-computation
4. Breaking circular dependencies

## Return Value

The `untracked` function returns whatever value is returned by the callback function:

```typescript
const count = signal(42);
const value = untracked(() => count() * 2);
console.log(value); // 84
```

## Examples

### With Effects

```typescript
import { signal, effect, untracked } from "@hellajs/reactive";

const count = signal(0);
const threshold = signal(10);

effect(() => {
  // Only re-run when count changes, not threshold
  if (count() > untracked(() => threshold())) {
    console.log("Count exceeded threshold!");
  }
});

// This will not trigger the effect
threshold.set(20);

// This will trigger the effect
count.set(25);
```

### With Computed Values

```typescript
import { signal, computed, untracked } from "@hellajs/reactive";

const firstName = signal("John");
const lastName = signal("Doe");
const showFullName = signal(true);

// Only depends on showFullName, not on firstName or lastName
const displayName = computed(() => {
  if (showFullName()) {
    // Read firstName and lastName without creating dependencies
    return untracked(() => `${firstName()} ${lastName()}`);
  } else {
    return untracked(() => firstName());
  }
});

// displayName won't update when firstName or lastName change,
// only when showFullName changes
firstName.set("Jane"); // displayName still returns "John Doe"
showFullName.set(false); // Now displayName updates to "John"
```

### Nested Untracked Calls

You can nest `untracked` calls, and the tracking state will be properly restored:

```typescript
import { signal, effect, untracked } from "@hellajs/reactive";

const a = signal(1);
const b = signal(2);
const c = signal(3);

effect(() => {
  // Don't track a or b, but do track c
  untracked(() => {
    console.log(a());
    untracked(() => console.log(b()));
  });

  console.log(c()); // This creates a dependency
});

// These won't cause the effect to re-run
a.set(10);
b.set(20);

// This will cause the effect to re-run
c.set(30);
```

## Under the Hood

The `untracked` function works by temporarily disabling dependency tracking while your callback function executes, then restoring the previous tracking state when it completes. This ensures that any signal reads inside the callback don't register as dependencies.
