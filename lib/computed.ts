import { effect } from "./effect";
import { signal } from "./signal";
import { untracked } from "./untracked";
import type { ComputedFn, SignalValue } from "./types";
/**
 * Creates a computed value that automatically updates when its dependencies change.
 * The computed value is lazily evaluated, meaning it only recalculates when accessed
 * and when its dependencies have changed.
 *
 * @template T - The type of value that this computed function returns
 * @param derive - A function that derives the computed value from other signals or state
 * @returns An accessor function that returns the current computed value
 *
 * @example
 * ```typescript
 * const count = signal(0);
 * const doubled = computed(() => count() * 2);
 * console.log(doubled()); // 0
 * count.set(5);
 * console.log(doubled()); // 10
 * ```
 */
export function computed<T>(deriveFn: ComputedFn<T>): SignalValue<T> {
  // Track the computation's internal state
  const computationState = {
    needsUpdate: false,
    disposed: false,
  };

  // Calculate initial value outside of tracking context to avoid circular dependencies
  // and prevent the initial calculation from creating dependencies
  const initialValue = untracked(() => deriveFn());

  // Create a backing signal to store the computed value
  const backingSignal = signal<T>(initialValue);

  // Set up an effect which runs whenever any dependency changes
  const cleanup = effect(() => {
    // Early return if the computation has been disposed
    if (computationState.disposed) return;

    // Mark that the value needs recalculation on next access (lazy evaluation)
    computationState.needsUpdate = true;

    // Execute the derivation to capture all dependencies.
    // This effect will re-run when dependencies change
    deriveFn();
  });

  // Lazy evaluation - consumers call to get the computed value when needed
  const accessor = () => {
    // Check if we need to recalculate the value before returning
    // Only update if both: (1) dependencies have changed, and (2) not disposed
    if (computationState.needsUpdate && !computationState.disposed) {
      // Calculate the new value
      const newValue = deriveFn();

      // Update backing storage with the new value
      backingSignal.set(newValue);

      // Reset the update flag since we're now up-to-date
      computationState.needsUpdate = false;
    }

    // Return the current value from our backing storage
    // This also tracks dependencies if called within another effect or computed
    return backingSignal();
  };

  // Add metadata and methods to the accessor function
  // These are non-enumerable properties by default with Object.defineProperties
  Object.defineProperties(accessor, {
    // Marker to identify this as a computed value (for debugging and tooling)
    _isComputed: { value: true },

    // Method to properly dispose of this computed value
    // Prevents memory leaks by cleaning up effect subscriptions
    _cleanup: {
      value: () => {
        // Mark as disposed so the effect won't run anymore
        computationState.disposed = true;

        // Clean up the tracking effect to remove subscriptions
        // This ensures this computed value no longer receives updates
        cleanup();
      },
    },
  });

  // For backward compatibility with earlier APIs
  // Some consuming code might expect _dispose instead of _cleanup
  (accessor as any)._dispose = () => {
    (accessor as any)._cleanup();
  };

  // Return the accessor function as the public API
  // Callers will invoke this function to get the current computed value
  return accessor;
}
