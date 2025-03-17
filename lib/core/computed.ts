import { effect } from "./effect";
import { signal } from "./signal";
import type { ComputedFn, SignalValue } from "../types";

/**
 * Creates a computed value that automatically updates when its dependencies change.
 */
export function computed<T>(deriveFn: ComputedFn<T>): SignalValue<T> {
  // Initialize state with lazy evaluation flags
  let value: T;
  let isStale = true;
  let isDisposed = false;

  // Create a backing signal that will handle dependency tracking
  const backingSignal = signal<T>(undefined as unknown as T);

  // Set up an effect to track dependencies and mark as stale
  const cleanup = effect(() => {
    if (isDisposed) return;

    // Mark as needing recalculation
    isStale = true;

    // Run the derivation just to track dependencies
    deriveFn();
  });

  // Create the accessor function
  const accessor = () => {
    // Recalculate if needed and not disposed
    if (isStale && !isDisposed) {
      value = deriveFn();
      backingSignal.set(value);
      isStale = false;
    }

    // Return value through backing signal to establish dependencies
    return backingSignal();
  };

  // Add metadata to the accessor
  Object.defineProperties(accessor, {
    _isComputed: { value: true },
    _cleanup: {
      value: () => {
        isDisposed = true;
        cleanup();
      },
    },
  });

  return accessor as SignalValue<T>;
}
