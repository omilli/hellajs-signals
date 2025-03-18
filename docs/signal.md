# Signal API

Signals are reactive state containers that notify subscribers when their values change. They are the foundation of the reactivity system.

## Creating Signals

```typescript
import { signal } from "@hellajs/reactive";

// Basic usage
const count = signal(0);
const name = signal("John");
const isActive = signal(true);
const user = signal({ name: "John", age: 30 });
const items = signal([1, 2, 3]);
```

## Reading from Signals

Call the signal as a function to read its current value:

```typescript
const count = signal(0);
console.log(count()); // 0
```

When you read a signal within an effect or computed value, a dependency is automatically created:

```typescript
effect(() => {
  console.log(`Current count is: ${count()}`);
});
```

## Updating Signals

There are two ways to update a signal:

### Using the `set` method

```typescript
const count = signal(0);
count.set(5);
```

### Using the `update` method

The `update` method takes a function that receives the current value and returns the new value:

```typescript
const count = signal(0);
count.update((n) => n + 1); // Increment by 1

const user = signal({ name: "John", age: 30 });
user.update((u) => ({ ...u, age: u.age + 1 })); // Increment age, keep name
```

## Signal Options

Signals accept an options object as their second parameter:

```typescript
const count = signal(0, {
  name: "counter", // Useful for debugging
  validators: [
    (value) => (value >= 0 ? value : undefined), // Only allow non-negative numbers
  ],
  onSet: (newValue, oldValue) => {
    console.log(`Value changed from ${oldValue} to ${newValue}`);
  },
});
```

### Available Options

| Option       | Type                                  | Description                                                                                    |
| ------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `name`       | `string`                              | A name for the signal (helpful for debugging)                                                  |
| `validators` | `Array<(value: T) => T \| undefined>` | Functions that validate new values. Return the value to accept it or `undefined` to reject it. |
| `onSet`      | `(newValue: T, oldValue: T) => void`  | Callback that runs after the value changes                                                     |

## Working with Object and Array Signals

When working with objects and arrays, always create a new reference when updating:

```typescript
const user = signal({ name: "John", age: 30 });

// Good - creates a new object
user.update((u) => ({ ...u, age: u.age + 1 }));

// Good - uses set with a new object
user.set({ ...user(), name: "Jane" });

// BAD - mutates the object directly, won't trigger updates
// user().age += 1;
```

For arrays:

```typescript
const items = signal([1, 2, 3]);

// Good - creates a new array
items.update((arr) => [...arr, 4]);

// Good - uses set with a new array
items.set([...items(), 5]);

// BAD - mutates the array directly, won't trigger updates
// items().push(4);
```

## Type Safety

In TypeScript, signals are fully type-safe:

```typescript
// Basic types
const count = signal<number>(0);
const name = signal<string>("John");

// Complex types
interface User {
  name: string;
  age: number;
}

const user = signal<User>({ name: "John", age: 30 });
```

## Examples

### Counter

```typescript
const count = signal(0);

// Increment
count.update((n) => n + 1);

// Decrement
count.update((n) => n - 1);

// Reset
count.set(0);
```

### Form Input

```typescript
const username = signal("");
const password = signal("");
const errors = signal<string[]>([]);

// In a form handler
const handleUsernameChange = (e) => {
  username.set(e.target.value);
};

const validateForm = () => {
  const newErrors = [];
  if (username().length < 3) {
    newErrors.push("Username must be at least 3 characters");
  }
  if (password().length < 8) {
    newErrors.push("Password must be at least 8 characters");
  }
  errors.set(newErrors);
  return newErrors.length === 0;
};
```
