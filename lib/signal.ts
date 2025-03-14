import { effectDependencies, getCurrentEffect, queueEffects } from "./effect";
import type { EffectFn, Signal, EqualityFn } from "./types";

/**
 * Creates a reactive signal with the specified initial value.
 *
 * A signal is a reactive primitive that holds a value and notifies subscribers when the value changes.
 * It provides a way to create reactive state that automatically tracks dependencies and updates
 * dependent computations when the value changes.
 *
 * @template T - The type of value stored in the signal
 * @param initialValue - The initial value to store in the signal
 * @param options - Optional configuration for signal behavior
 * @param options.equals - Custom equality function to determine if value has changed (defaults to reference equality)
 * @returns A signal function that can be called to get the current value and automatically tracks dependencies.
 *          The signal also includes methods to update the value and access internal state:
 *          - `set(newValue)`: Updates the signal's value and notifies subscribers if changed
 *
 * @example
 * ```ts
 * const count = signal(0);
 * console.log(count()); // Gets current value: 0
 * count.set(1); // Updates value and notifies subscribers
 * ```
 */
export function signal<T>(
  initialValue: T,
  options?: { equals?: EqualityFn<T> }
): Signal<T> {
  // Default equality function uses reference equality
  const equals = options?.equals || ((a, b) => a === b);

  // Use a WeakSet for subscribers that may be garbage collected
  const state = {
    value: initialValue,
    subscribers: new Set<EffectFn>(),
  };

  const createSignal = function () {
    // Check if we're currently executing within an effect context
    const activeEffect = getCurrentEffect();
    if (activeEffect) {
      // Add the active effect to this signal's subscribers
      state.subscribers.add(activeEffect);

      // Use weak references for bidirectional tracking when possible
      const effectDeps = effectDependencies.get(activeEffect) || new Set();
      effectDeps.add(createSignal);
      effectDependencies.set(activeEffect, effectDeps);
    }
    return state.value;
  } as Signal<T>;

  // Define properties and methods on the signal function
  // Use Object.defineProperties for non-enumerable properties
  Object.defineProperties(createSignal, {
    // Internal accessor for the raw value (primarily for testing/debugging)
    _value: {
      get: () => state.value,
      set: (v) => {
        // Setter directly updates without notifications
        state.value = v; // (used internally or for batched updates)
      },
    },

    // Subscribers list
    _deps: {
      get: () => state.subscribers, // Set of effects
    },

    // Public API for Non-Atomic updates
    set: {
      value: (newValue: T) => {
        // Use custom equality function to avoid unnecessary updates
        if (!equals(newValue, state.value)) {
          state.value = newValue;

          // queueEffects ensures effects run after current execution completes
          // and respects batching for efficiency
          queueEffects(state.subscribers);
        }
      },
    },

    // Public API for Atomic updates
    update: {
      value: (updater: (currentValue: T) => T) => {
        const newValue = updater(state.value);
        createSignal.set(newValue);
      },
    },
  });

  // Return the function with attached methods
  return createSignal;
}
