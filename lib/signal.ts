import { effectDependencies, getCurrentEffect, queueEffects } from "./effect";
import type { EffectFn, Signal } from "./types";

/**
 * Creates a reactive signal with the specified initial value.
 *
 * A signal is a reactive primitive that holds a value and notifies subscribers when the value changes.
 * It provides a way to create reactive state that automatically tracks dependencies and updates
 * dependent computations when the value changes.
 *
 * @template T - The type of value stored in the signal
 * @param initialValue - The initial value to store in the signal
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
export function signal<T>(initialValue: T): Signal<T> {
  // Encapsulate the signal's data
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

      // Register signal in the effect's dependency list
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

    // Public API for updating the signal value
    set: {
      value: (newValue: T) => {
        // Only update and notify if the value actually changed
        if (newValue !== state.value) {
          state.value = newValue;

          // queueEffects ensures effects run after current execution completes
          // and respects batching for efficiency
          queueEffects(state.subscribers);
        }
      },
    },
  });

  // Return the function with attached methods
  return createSignal;
}
