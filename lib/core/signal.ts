import { getCurrentContext } from "../context";
import type { EffectFn, Signal, SignalOptions } from "../types";
import { getCurrentEffect, queueEffects } from "../utils";

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
 * @returns A signal function that can be called to get the current value and automatically tracks dependencies.
 *          The signal also includes methods to update the value and access internal state.
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
  options?: SignalOptions<T>
): Signal<T> {
  const ctx = getCurrentContext();
  const validators = options?.validators || [];
  const name = options?.name;

  // Load initial value from storage if configured
  let initialStateValue = initialValue;

  // Use a WeakSet for subscribers that may be garbage collected
  const state = {
    value: initialStateValue,
    subscribers: new Set<WeakRef<EffectFn>>(),
  };

  const createSignal = function () {
    // Check if we're currently executing within an effect context
    const activeEffect = getCurrentEffect(ctx);
    if (activeEffect) {
      // Add the active effect to this signal's subscribers
      state.subscribers.add(new WeakRef(activeEffect));

      // Use bidirectional tracking: effects know their dependencies and signals know their subscribers
      // Track in context-specific storage
      const effectDeps = ctx.effectDependencies.get(activeEffect) || new Set();
      effectDeps.add(createSignal as Signal<unknown>);
      ctx.effectDependencies.set(activeEffect, effectDeps);
    }
    return state.value;
  } as Signal<T>;

  // Define properties and methods on the signal function
  Object.defineProperties(createSignal, {
    // Internal accessor for the raw value (primarily for testing/debugging)
    _value: {
      get: () => state.value,
      set: (v) => {
        // Setter directly updates without notifications
        state.value = v; // (used internally or for batched updates)
      },
    },

    // Signal name for debugging
    ...(name ? { _name: { value: name } } : {}),

    // Subscribers list
    _deps: {
      get: () => state.subscribers as Set<WeakRef<EffectFn>>, // Set of effects
    },

    // Public API for Non-Atomic updates
    set: {
      value: (newValue: T) => {
        // Run validators if provided
        if (validators.length > 0) {
          for (const validator of validators) {
            if (!validator(newValue)) {
              console.warn(
                `Validation failed for signal "${name || "unnamed"}"`,
                newValue
              );
              return; // Skip update if validation fails
            }
          }
        }

        const oldValue = state.value;
        state.value = newValue;

        // Call onSet hook if provided
        if (options?.onSet) {
          try {
            options.onSet(newValue, oldValue);
          } catch (e) {
            console.error(
              `Error in onSet hook for signal "${name || "unnamed"}"`,
              e
            );
          }
        }

        // queueEffects ensures effects run after current execution completes
        // and respects batching for efficiency
        queueEffects(ctx, state.subscribers);
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
