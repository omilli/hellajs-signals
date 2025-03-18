# Batch API

Batching allows you to group multiple signal updates together so that effects and computed values will only update once after all updates are complete.

## Basic Usage

```typescript
import { signal, effect, batch } from "@hellajs/reactive";

const firstName = signal("John");
const lastName = signal("Doe");

effect(() => {
  console.log(`Name: ${firstName()} ${lastName()}`);
});
// Logs: "Name: John Doe"

// Without batching, this would cause the effect to run twice
batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
});
// Logs once: "Name: Jane Smith"
```

## Why Use Batching?

Batching is useful when:

1. You need to update multiple reactive values at once
2. You want to avoid intermediate states
3. You want to optimize performance by reducing the number of updates

## Nested Batches

Batches can be nested, and effects will only run after the outermost batch completes:

```typescript
const a = signal(1);
const b = signal(2);
const c = signal(3);

effect(() => {
  console.log(`a=${a()}, b=${b()}, c=${c()}`);
});
// Logs: "a=1, b=2, c=3"

batch(() => {
  a.set(10);

  batch(() => {
    b.set(20);
  });

  c.set(30);
});
// Logs once: "a=10, b=20, c=30"
```

## Return Values

The `batch` function returns the return value of its callback function:

```typescript
const result = batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  return "Updates complete";
});

console.log(result); // "Updates complete"
```

## Error Handling

If an error occurs during a batch operation, the batch will still end and any updates that were made before the error will be applied:

```typescript
const count = signal(0);

effect(() => {
  console.log(`Count: ${count()}`);
});
// Logs: "Count: 0"

try {
  batch(() => {
    count.set(1);
    throw new Error("Something went wrong");
    count.set(2); // This line never executes
  });
} catch (error) {
  console.error("Error during batch:", error);
}

console.log(count()); // 1
// Effect would have logged: "Count: 1"
```

## Asynchronous Code

Batch operations do not inherently handle asynchronous code. The batch ends when the synchronous part of the callback completes:

```typescript
batch(async () => {
  count.set(1);

  // Batch already ended before this promise resolves
  await someAsyncOperation();

  // This update is not part of the previous batch
  count.set(2);
});
```

If you need to batch async updates, you need to use another batch after the async operation:

```typescript
async function updateWithAsyncData() {
  // First batch for immediate updates
  batch(() => {
    loading.set(true);
    error.set(null);
  });

  try {
    const data = await fetchData();

    // Second batch for updates after async operation
    batch(() => {
      result.set(data);
      loading.set(false);
    });
  } catch (err) {
    batch(() => {
      error.set(err);
      loading.set(false);
    });
  }
}
```

## Best Practices

### Do Use Batch For

- Multiple related updates that should be treated as a single transaction
- Form submissions where multiple fields need to be updated
- Resetting multiple values at once
- Complex state transitions with multiple steps

```typescript
function submitForm() {
  batch(() => {
    // Update all form-related state at once
    formData.set({ ...collectFormData() });
    errors.set([]);
    submitted.set(true);
    loading.set(false);
  });
}
```

### Don't Use Batch For

- Single updates
- Updates that logically should trigger separate effects
- Updates that depend on the intermediate state of other updates

```typescript
// Don't do this - updates should trigger separate effects
batch(() => {
  // These should probably be separate operations
  userLoggedIn.set(true);
  pageVisits.update((count) => count + 1);
});
```

## Advanced Example: Optimizing Form Updates

```typescript
const formData = signal({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const validationErrors = signal({});
const isSubmitting = signal(false);
const isFormValid = computed(
  () => Object.keys(validationErrors()).length === 0
);

function handleFieldChange(field, value) {
  batch(() => {
    // Update form data
    formData.update((data) => ({
      ...data,
      [field]: value,
    }));

    // Update validation for this field
    validateField(field, value);
  });
}

function validateField(field, value) {
  // Validation logic
  const errors = { ...validationErrors() };

  if (field === "email" && !isValidEmail(value)) {
    errors.email = "Please enter a valid email";
  } else {
    delete errors.email;
  }

  // Update errors
  validationErrors.set(errors);
}
```
