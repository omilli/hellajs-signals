# @hellajs/reactive

A reactive javascript library

## API

### signal(initialValue)

Creates a reactive signal with the specified initial value.

```ts
function signal<T>(initialValue: T): Signal<T>;
```

A signal is a reactive primitive that holds a value and notifies subscribers when the value changes. It provides a way to create reactive state that automatically tracks dependencies and updates dependent computations when the value changes.

#### Parameters

- `initialValue` - The initial value to store in the signal

#### Returns

A signal function that can be called to get the current value. The returned function also has a `set` method to update the value.

#### Example

```ts
// Create a signal with an initial value of 0
const count = signal(0);

// Get the current value by calling the signal as a function
console.log(count()); // 0

// Update the value with .set()
count.set(1);
console.log(count()); // 1

// Signals can hold any type of value
const user = signal({ name: "Alice", age: 30 });
console.log(user().name); // 'Alice'

// Update values
user.set({ name: "Bob", age: 25 });
```

### computed(deriveFn)

Creates a computed value that automatically updates when its dependencies change.

```ts
function computed<T>(deriveFn: ComputedFn<T>): SignalValue<T>;
```

Computed values are lazily evaluated, meaning they only recalculate when accessed and when their dependencies have changed. Dependencies are automatically tracked when the derive function reads from signals or other computed values.

#### Parameters

- `deriveFn` - A function that derives the computed value from other signals or state

#### Returns

An accessor function that returns the current computed value. When called within an effect or another computed value, it will automatically establish dependency relationships.

#### Example

```ts
// Create signals to hold base values
const count = signal(0);
const multiplier = signal(2);

// Create a computed value based on these signals
const doubled = computed(() => count() * multiplier());

// Access the computed value
console.log(doubled()); // 0

// When dependencies change, the computed value updates
count.set(5);
console.log(doubled()); // 10

multiplier.set(3);
console.log(doubled()); // 15

// Computed values can depend on other computed values
const squared = computed(() => doubled() * doubled());
console.log(squared()); // 225 (15 * 15)
```
