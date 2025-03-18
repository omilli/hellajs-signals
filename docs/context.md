# Context API

The Context API allows you to create isolated reactive systems with their own state and reactivity. Each context has its own independent set of signals, effects, and computed values that won't interfere with each other.

## Creating a Context

```typescript
import { createContext } from "@hellajs/reactive";

const ctx1 = createContext();
const ctx2 = createContext();
```

## Using a Context

Each context provides the same API as the global reactive functions:

```typescript
const ctx = createContext();

// Create a signal in this context
const count = ctx.signal(0);

// Create a computed value in this context
const doubled = ctx.computed(() => count() * 2);

// Create an effect in this context
const dispose = ctx.effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Use batch in this context
ctx.batch(() => {
  count.set(5);
  // Other updates...
});

// Use untracked in this context
ctx.untracked(() => {
  console.log(count()); // Read without tracking
});
```

## Context Isolation

The key benefit of contexts is isolation. Updates in one context won't trigger effects in another context:

```typescript
const ctx1 = createContext();
const ctx2 = createContext();

// Create signals with the same name but in different contexts
const count1 = ctx1.signal(0);
const count2 = ctx2.signal(0);

// Effects in different contexts
ctx1.effect(() => {
  console.log(`Context 1 count: ${count1()}`);
});

ctx2.effect(() => {
  console.log(`Context 2 count: ${count2()}`);
});

// Update only affects its own context
count1.set(5);
// Logs: "Context 1 count: 5"
// Does NOT log anything from Context 2
```

## Global Default Context

When you use the top-level `signal`, `computed`, `effect` functions, they use a shared default context:

```typescript
import { signal, effect, getDefaultContext } from "@hellajs/reactive";

// These use the default context
const count = signal(0);
effect(() => console.log(count()));

// You can get a reference to the default context
const defaultCtx = getDefaultContext();
```

## Disposing a Context

You can dispose an entire context when you're done with it:

```typescript
const ctx = createContext();

const count = ctx.signal(0);
const dispose = ctx.effect(() => {
  console.log(count());
});

// Later, clean up everything in this context
ctx.dispose();

// No need to call individual dispose functions
// count.set(5); // This won't trigger the effect anymore
```

## Common Use Cases

### Isolated Components

```typescript
function createCounter() {
  const ctx = createContext();

  const count = ctx.signal(0);

  function increment() {
    count.update((n) => n + 1);
  }

  function decrement() {
    count.update((n) => n - 1);
  }

  // Set up the UI
  ctx.effect(() => {
    document.getElementById("count").textContent = count().toString();
  });

  return {
    count,
    increment,
    decrement,
    dispose: ctx.dispose,
  };
}

// Create multiple isolated counters
const counter1 = createCounter();
const counter2 = createCounter();
```

### Module-Level Reactivity

```typescript
// userState.js
const userCtx = createContext();

export const user = userCtx.signal(null);
export const isLoggedIn = userCtx.computed(() => !!user());
export const username = userCtx.computed(() => user()?.name || "Guest");

export function login(userData) {
  userCtx.batch(() => {
    user.set(userData);
    // Other login-related state updates...
  });
}

export function logout() {
  user.set(null);
}

// Other files can import and use these, and effects will be isolated
```

### Testing

Contexts are very useful for testing reactive code:

```typescript
describe("User module", () => {
  let testCtx;
  let testUser;
  let events = [];

  beforeEach(() => {
    testCtx = createContext();
    testUser = testCtx.signal(null);
    events = [];

    // Create a test effect
    testCtx.effect(() => {
      const user = testUser();
      events.push(`User state changed: ${user ? user.name : "logged out"}`);
    });
  });

  afterEach(() => {
    testCtx.dispose();
  });

  test("should track login state", () => {
    // Test interactions
    testUser.set({ name: "Alice" });
    expect(events).toContain("User state changed: Alice");

    testUser.set(null);
    expect(events).toContain("User state changed: logged out");
  });
});
```

## Advanced: Working with Multiple Contexts

You can compose features from multiple contexts:

```typescript
// Create shared functionality
function createSharedFeatures() {
  const sharedCtx = createContext();

  const theme = sharedCtx.signal("light");
  const language = sharedCtx.signal("en");

  return {
    theme,
    language,
    dispose: sharedCtx.dispose,
  };
}

// Create component-specific functionality
function createComponent(shared) {
  const componentCtx = createContext();

  // Use values from shared context
  componentCtx.effect(() => {
    console.log(`Component using theme: ${shared.theme()}`);
  });

  const isActive = componentCtx.signal(false);

  return {
    isActive,
    dispose: componentCtx.dispose,
  };
}

// Usage
const shared = createSharedFeatures();
const component1 = createComponent(shared);
const component2 = createComponent(shared);

// Update shared state affects both components
shared.theme.set("dark");
```
