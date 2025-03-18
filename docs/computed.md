# Computed API

Computed values are derived state that automatically update when their dependencies change. They are lazy-evaluated and memoized, meaning they only recalculate when accessed after their dependencies have changed.

## Creating Computed Values

```typescript
import { signal, computed } from "@hellajs/reactive";

const count = signal(0);
const doubled = computed(() => count() * 2);
```

## Reading Computed Values

Access the value by calling the computed value as a function:

```typescript
console.log(doubled()); // 0 initially, then 2 after count is set to 1
```

When you read a computed value within an effect or another computed value, a dependency is automatically created.

## Computed Functions

The function you pass to `computed` should:

- Be pure (no side effects)
- Return a value derived from other reactive sources (signals or computed values)

```typescript
const firstName = signal("John");
const lastName = signal("Doe");

const fullName = computed(() => `${firstName()} ${lastName()}`);
```

## Dynamic Dependencies

Computed values can have dynamic dependencies that change based on conditions:

```typescript
const showDetails = signal(false);
const basicInfo = signal("Basic user info");
const detailedInfo = signal("Detailed user info");

const userInfo = computed(() => {
  if (showDetails()) {
    return detailedInfo();
  } else {
    return basicInfo();
  }
});
```

In this example, `userInfo` only depends on `detailedInfo` when `showDetails` is true, and only depends on `basicInfo` when `showDetails` is false.

## Computed Options

Computed values accept an options object as their second parameter:

```typescript
const doubled = computed(() => count() * 2, {
  name: "doubledValue", // Useful for debugging
  keepAlive: true, // Keeps the computation active even when not accessed
  onComputed: (newValue, oldValue) => {
    console.log(`Value changed from ${oldValue} to ${newValue}`);
  },
  onError: (error) => {
    console.error("Error in computed:", error);
  },
});
```

### Available Options

| Option       | Type                                 | Description                                                             |
| ------------ | ------------------------------------ | ----------------------------------------------------------------------- |
| `name`       | `string`                             | A name for the computed value (helpful for debugging)                   |
| `keepAlive`  | `boolean`                            | If true, computes value eagerly and stays active even when not accessed |
| `onComputed` | `(newValue: T, oldValue: T) => void` | Callback that runs when the computed value changes                      |
| `onError`    | `(error: Error) => void`             | Callback that runs if the computation throws an error                   |

## Chaining Computed Values

Computed values can depend on other computed values, creating a chain of reactive dependencies:

```typescript
const count = signal(0);
const doubled = computed(() => count() * 2);
const quadrupled = computed(() => doubled() * 2);
const isEven = computed(() => quadrupled() % 2 === 0);
```

## Cleanup

Computed values that aren't being used by any effects or other active computed values will be automatically cleaned up by the garbage collector.

In some cases, you might want to manually clean up a computed value:

```typescript
(doubled as any)._cleanup();
```

However, this is rarely needed in practice.

## Common Patterns

### Derived State

```typescript
const items = signal([
  { id: 1, text: "Task 1", completed: false },
  { id: 2, text: "Task 2", completed: true },
]);

// Derived values
const completedItems = computed(() => {
  return items().filter((item) => item.completed);
});

const incompletedItems = computed(() => {
  return items().filter((item) => !item.completed);
});

const completedCount = computed(() => completedItems().length);
const totalCount = computed(() => items().length);
const progress = computed(() => {
  return totalCount() === 0
    ? 100
    : Math.round((completedCount() / totalCount()) * 100);
});
```

### Expensive Computations

For computations that are expensive, the lazy evaluation of computed values is beneficial:

```typescript
const data = signal([
  /* large array of items */
]);

const expensiveCalculation = computed(() => {
  console.log("Running expensive calculation...");
  return data().reduce((sum, item) => sum + complexProcessing(item), 0);
});

// The calculation only runs when expensiveCalculation() is called
// And only recalculates when data changes
```

### Formatted Values

```typescript
const date = signal(new Date());

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date());
});
```
