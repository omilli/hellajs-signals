import { effect } from "./effect";
import { signal } from "./signal";
import type { ComputedFn, ComputedOptions, SignalValue } from "../types";
import { untracked } from "./untracked";

/**
 * Creates a computed value that automatically updates when its dependencies change.
 */
export function computed<T>(
  deriveFn: ComputedFn<T>,
  options?: ComputedOptions<T>
): SignalValue<T> {
  const keepAlive = options?.keepAlive || false;
  const name = options?.name;
  const onError = options?.onError;
  const onComputed = options?.onComputed;

  // Initialize state with lazy evaluation flags
  let value: T;
  let isStale = true;
  let isDisposed = false;

  // Create a backing signal that will handle dependency tracking
  const backingSignal = signal<T>(undefined as unknown as T, { name });

  // Set up an effect to track dependencies and mark as stale
  const cleanup = effect(
    () => {
      if (isDisposed) return;

      // Mark as needing recalculation
      isStale = true;

      // If keepAlive is true, immediately compute the value
      if (keepAlive) {
        try {
          const newValue = deriveFn();
          backingSignal.set(newValue);
          value = newValue;
          isStale = false;

          // Call onComputed hook if provided
          if (onComputed) {
            untracked(() => onComputed(newValue));
          }
        } catch (error) {
          if (onError && error instanceof Error) {
            onError(error);
          } else {
            console.error("Error in computed:", name || "unnamed", error);
          }
        }
      } else {
        // Just track dependencies by running the function
        try {
          deriveFn();
        } catch (error) {
          // Handle errors in tracking phase
          if (onError && error instanceof Error) {
            onError(error);
          } else {
            console.error(
              "Error tracking computed dependencies:",
              name || "unnamed",
              error
            );
          }
        }
      }
    },
    { name: `${name || "computed"}_tracker` }
  );

  // Create the accessor function
  const accessor = () => {
    // Recalculate if needed and not disposed
    if (isStale && !isDisposed) {
      try {
        value = deriveFn();
        backingSignal.set(value);
        isStale = false;

        // Call onComputed hook if provided
        if (onComputed) {
          untracked(() => onComputed(value));
        }
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error);
        } else {
          console.error("Error in computed:", name || "unnamed", error);
        }

        // Re-throw if no error handler
        if (!onError) {
          throw error;
        }
      }
    }

    // Return value through backing signal to establish dependencies
    return backingSignal();
  };

  // Add metadata to the accessor
  Object.defineProperties(accessor, {
    _isComputed: { value: true },
    _name: { value: name },
    _cleanup: {
      value: () => {
        isDisposed = true;
        cleanup();
      },
    },
  });

  return accessor as SignalValue<T>;
}
