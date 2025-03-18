# @hellajs/signals

A lightweight, powerful reactive programming library for JavaScript/TypeScript applications, providing fine-grained reactivity with an intuitive API.

## Features

- **Signals**: Reactive state containers that notify subscribers when values change
- **Computed Values**: Derived state that automatically updates when dependencies change
- **Effects**: Side effects that run when their reactive dependencies update
- **Batching**: Group multiple state changes together to avoid unnecessary recalculations
- **Untracked Execution**: Execute code without tracking reactive dependencies
- **Context Isolation**: Create isolated reactive contexts with independent state and reactivity

## Core Concepts

### Signals

Signals are the foundation of the reactive system, representing values that can change over time and notify subscribers when they do.

```typescript
import { signal } from "@hellajs/reactive";

const count = signal(0);
console.log(count()); // 0

count.set(5);
console.log(count()); // 5

// You can also use the update method with a function
count.update((n) => n + 1);
console.log(count()); // 6
```

### Computed Values

Computed values derive from other reactive sources and automatically update when their dependencies change.

```typescript
import { signal, computed } from "@hellajs/reactive";

const firstName = signal("John");
const lastName = signal("Doe");

const fullName = computed(() => `${firstName()} ${lastName()}`);
console.log(fullName()); // "John Doe"

firstName.set("Jane");
console.log(fullName()); // "Jane Doe"
```

### Effects

Effects run side effects whenever their reactive dependencies update.

```typescript
import { signal, effect } from "@hellajs/reactive";

const user = signal({ name: "John", online: true });

effect(() => {
  console.log(`${user().name} is ${user().online ? "online" : "offline"}`);
});
// Logs: "John is online"

user.update((u) => ({ ...u, online: false }));
// Automatically logs: "John is offline"
```

### Batch Updates

Group multiple state changes to avoid unnecessary recalculations.

```typescript
import { signal, effect, batch } from "@hellajs/reactive";

const firstName = signal("John");
const lastName = signal("Doe");

effect(() => console.log(`${firstName()} ${lastName()}`));
// Logs: "John Doe"

batch(() => {
  // Both updates happen in a single batch, effect runs only once after both changes
  firstName.set("Jane");
  lastName.set("Smith");
});
// Logs: "Jane Smith" (only once)
```

### Isolated Contexts

Create isolated reactive systems for advanced use cases.

```typescript
import { createContext } from "@hellajs/reactive";

const ctx1 = createContext();
const ctx2 = createContext();

const count1 = ctx1.signal(0);
const count2 = ctx2.signal(0);

// Effects in different contexts don't interfere with each other
ctx1.effect(() => console.log(`Context 1: ${count1()}`));
ctx2.effect(() => console.log(`Context 2: ${count2()}`));
```

## Documentation

For detailed API documentation, check out these guides:

- [Signal](./docs/signal.md) - Creating and managing reactive state
- [Computed](./docs/computed.md) - Derived state that automatically updates when dependencies change
- [Effect](./docs/effect.md) - Side effects that run when their reactive dependencies update
- [Batch](./docs/batch.md) - Grouping multiple state changes
- [Untracked](./docs/untracked.md) - Reading signals without creating dependencies
- [Context](./docs/context.md) - Creating isolated reactive systems
