import { effect } from "./effect";
import { signal } from "./signal";
import type { ComputedFn, SignalValue } from "./types";

/**
 * Creates a computed value derived from other signals
 */
export function computed<T>(compute: ComputedFn<T>): SignalValue<T> {
  // Calculate initial value with one execution only
  const initialValue = compute();
  const sig = signal<T>(initialValue);

  // Add a dirty flag to avoid unnecessary recalculations
  let dirty = false;

  // Create an effect to track dependencies and mark as dirty when they change
  const dispose = effect(() => {
    // Always mark as dirty when dependencies change
    // This ensures the computed value updates when any dependency changes
    dirty = true;

    // Track dependencies by running the compute function
    // We don't need firstRun logic since we always just mark as dirty
    compute();
  });

  // Return a getter function that checks for dirtiness and recomputes only when needed
  const computedGetter = () => {
    if (dirty) {
      // Only recompute when accessed and dirty
      sig.set(compute());
      dirty = false;
    }
    return sig();
  };

  // Add dispose capability to prevent memory leaks
  (computedGetter as any)._dispose = () => {
    dispose();
  };

  return computedGetter;
}
