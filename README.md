# @hellajs/reactive

A reactive javascript library

## API

### signal(value)

```ts
const counter = signal(0);
setInterval(() => {
  counter.set(counter() + 1);
}, 1000);
```

### computed

```ts
const counter = signal(0);
const double = computed(() => counter() * 2);
setInterval(() => {
  counter.set(counter() + 1);
}, 1000);
```

### effect

```ts
const counter = signal(0);
setInterval(() => {
  counter.set(counter() + 1);
}, 1000);
effect(() => {
  console.log(`counter updated: ${counter()}`);
});
```

### Performance Enhancements

#### Memoization for computed values

Computed values are memoized to avoid unnecessary recalculations:

```ts
const expensive = computed(() => {
  console.log("Computing...");
  return heavyCalculation(input());
});

// First access computes the value
const value1 = expensive();

// Second access returns cached value without recomputing
const value2 = expensive();

// Only recomputes when dependencies change
input.set(newValue);
const value3 = expensive(); // Recomputes
```

#### Prioritized effect execution

Effects can be given priorities to control their execution order:

```ts
// This high-priority effect runs before normal and low-priority effects
effect(() => updateCriticalUI(value()), { priority: "high" });

// Normal priority (default)
effect(() => updateUI(value()));

// Low priority effects run last
effect(() => logStateChange(value()), { priority: "low" });
```

### Batch updates

Group multiple signal updates to trigger effects only once at the end:

```ts
batch(() => {
  firstName.set("John");
  lastName.set("Doe");
  age.set(30);
  // Effects depending on these signals will only run once
});
```

### Untracking signal dependencies

Read signals without creating dependencies:

```ts
effect(() => {
  // This creates a dependency
  const name = userName();

  // This reads the value without creating a dependency
  const debugValue = untrack(() => debugState());
});
```
