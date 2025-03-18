# Effect API

Effects are reactive side effects that run when their dependencies change. They automatically track reactive dependencies and re-execute when those dependencies update.

## Creating Effects

```typescript
import { signal, effect } from "@hellajs/reactive";

const count = signal(0);

const dispose = effect(() => {
  console.log(`Count is now: ${count()}`);
});
// Logs: "Count is now: 0"

count.set(5);
// Logs: "Count is now: 5"
```

## Effect Lifecycle

Effects:

1. Run immediately when created
2. Re-run when any reactive dependency (signal or computed value) changes
3. Can be manually disposed to stop tracking dependencies

## Disposing Effects

Every `effect` call returns a disposal function that stops the effect from running:

```typescript
const count = signal(0);
const dispose = effect(() => {
  console.log(`Count: ${count()}`);
});

// Later, when you want to clean up:
dispose();

// After disposal, updates won't trigger the effect
count.set(99); // No logging
```

## Effect Options

Effects accept an options object as their second parameter:

```typescript
const count = signal(0);

effect(
  () => {
    console.log(`Count: ${count()}`);
  },
  {
    name: "countLogger", // Useful for debugging
    once: false, // If true, only runs once and then auto-disposes
    debounce: 100, // Debounce in milliseconds
    priority: 5, // Higher priority effects run first
    scheduler: (run) => setTimeout(run, 0), // Custom scheduling
    onError: (error) => console.error("Effect error:", error),
    onCleanup: () => console.log("Effect cleaned up"),
  }
);
```

### Available Options

| Option      | Type                        | Description                                            |
| ----------- | --------------------------- | ------------------------------------------------------ |
| `name`      | `string`                    | A name for the effect (helpful for debugging)          |
| `once`      | `boolean`                   | If true, the effect runs only once                     |
| `debounce`  | `number`                    | Time in ms to debounce effect execution                |
| `priority`  | `number`                    | Higher priority effects run before lower priority ones |
| `scheduler` | `(run: () => void) => void` | Custom scheduler for running the effect                |
| `onError`   | `(error: Error) => void`    | Error handler for the effect                           |
| `onCleanup` | `() => void`                | Clean-up function called when effect is disposed       |

## Cleanup Functions

Effects can return a function that will be called when the effect is disposed or re-run:

```typescript
const timer = signal(0);

const dispose = effect(() => {
  console.log(`Setting up timer, current value: ${timer()}`);

  // Start an interval
  const intervalId = setInterval(() => {
    timer.update((t) => t + 1);
  }, 1000);

  // Return cleanup function
  return () => {
    console.log("Cleaning up timer");
    clearInterval(intervalId);
  };
});

// Later, to clean up completely:
dispose();
```

## Dynamic Dependencies

Effects automatically track any signals accessed during their execution:

```typescript
const showDetails = signal(false);
const basicInfo = signal("Basic info");
const detailedInfo = signal("Detailed info");

effect(() => {
  // Dependencies change based on the condition
  const info = showDetails() ? detailedInfo() : basicInfo();
  console.log(info);
});
```

When `showDetails` is false, the effect only depends on `basicInfo`. When `showDetails` is true, it depends on `detailedInfo`.

## Error Handling

Effects have built-in error handling:

```typescript
const count = signal(0);

effect(
  () => {
    if (count() === 5) {
      throw new Error("Count should not be 5!");
    }
    console.log(`Count: ${count()}`);
  },
  {
    onError: (error) => {
      console.error("Effect error:", error.message);
    },
  }
);
```

## Asynchronous Effects

Effects work with async functions:

```typescript
const userId = signal(1);
const user = signal(null);
const loading = signal(false);

effect(async () => {
  const id = userId();
  loading.set(true);

  try {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/users/${id}`
    );
    const data = await response.json();
    user.set(data);
  } catch (error) {
    console.error("Failed to fetch user:", error);
  } finally {
    loading.set(false);
  }
});
```

## Common Patterns

### DOM Updates

```typescript
const name = signal("World");

effect(() => {
  document.getElementById("greeting").textContent = `Hello, ${name()}!`;
});
```

### Conditional Effects

```typescript
const isLoggedIn = signal(false);
const userId = signal(null);

effect(() => {
  if (isLoggedIn()) {
    console.log(`Logged in with user ID: ${userId()}`);
  } else {
    console.log("Not logged in");
  }
});
```

### Event Listeners

```typescript
const windowSize = signal({
  width: window.innerWidth,
  height: window.innerHeight,
});

effect(() => {
  // Using the signal value ensures the effect runs once to set up listeners
  console.log(`Window size: ${windowSize().width}x${windowSize().height}`);

  // Set up listener
  const handleResize = () => {
    windowSize.set({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  window.addEventListener("resize", handleResize);

  // Clean up
  return () => {
    window.removeEventListener("resize", handleResize);
  };
});
```
