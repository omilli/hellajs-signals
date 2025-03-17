import { effect } from "./effect";
import { signal } from "./signal";
import type { ComputedFn, SignalValue } from "./types";

/**
 * Creates a computed value that automatically updates when its dependencies change.
 * The computed value is lazily evaluated, meaning it only recalculates when accessed
 * and when its dependencies have changed.
 *
 * @template T - The type of value that this computed function returns
 * @param derive - A function that derives the computed value from other signals or state
 * @returns An accessor function that returns the current computed value
 */
export function computed<T>(deriveFn: ComputedFn<T>): SignalValue<T> {
  // Track the computation's internal state
  const computationState = {
    needsUpdate: true, // Initially true to ensure first access computes
    disposed: false,
    value: undefined as unknown as T, // Store the computed value directly
    hasValue: false, // Track if we've computed a value yet
  };

  // Create a backing signal - but we'll avoid redundant derivation calls
  const backingSignal = signal<T>(undefined as unknown as T);

  // Set up an effect which runs whenever any dependency changes
  const cleanup = effect(() => {
    // Early return if the computation has been disposed
    if (computationState.disposed) return;

    // Mark that the value needs recalculation on next access
    computationState.needsUpdate = true;

    // We only need to execute the derivation to track dependencies
    // We don't need to store the result here, as it will be calculated
    // on demand when the computed value is accessed
    deriveFn();
  });

  // Lazy evaluation - consumers call to get the computed value when needed
  const accessor = () => {
    // Check if we need to recalculate the value before returning
    if (computationState.needsUpdate && !computationState.disposed) {
      // Calculate the new value exactly once
      const newValue = deriveFn();

      // Store the value internally and in the backing signal
      backingSignal.set(newValue);
      computationState.value = newValue;
      computationState.hasValue = true;

      // Reset the update flag since we're now up-to-date
      computationState.needsUpdate = false;
    }

    // Return the current value from our backing storage
    // This also tracks dependencies if called within another effect or computed
    return backingSignal();
  };

  // Add metadata and methods to the accessor function
  Object.defineProperties(accessor, {
    _isComputed: { value: true },
    _cleanup: {
      value: () => {
        // Mark as disposed so the effect won't run anymore
        computationState.disposed = true;
        cleanup();
      },
    },
  });

  return accessor as SignalValue<T>;
}
