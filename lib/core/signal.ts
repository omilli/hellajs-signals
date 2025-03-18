import { getCurrentContext } from "../context";
import type { EffectFn, Signal, SignalOptions } from "../types";
import { getActiveTracker, queueEffects } from "../utils";

/**
 * Creates a new signal with the given initial value and options.
 * A signal is a reactive primitive that tracks a single value and notifies
 * subscribers when the value changes.
 *
 * @template T - The type of value stored in the signal
 * @param value - The initial value of the signal
 * @param options - Additional options for configuring the signal behavior
 * @returns A signal function that can be called to read the current value
 */
export function signal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  // Get the current reactive context - contains the global state for reactivity
  const ctx = getCurrentContext();

  // Extract options with defaults
  const { name, validators = [] } = options || {};

  // Track effects that depend on this signal using WeakRefs to avoid memory leaks
  const subscribers = new Set<WeakRef<EffectFn>>();

  /**
   * The core signal function that both reads the value and tracks dependencies
   * This function is called when consumers access the signal value: signal()
   */
  const signalFn = (() => {
    // Check if this read is happening during an effect execution
    const activeEffect = getActiveTracker(ctx);

    // If so, establish bidirectional links between effect and signal
    if (activeEffect) {
      // Get/create the set of signals this effect depends on
      const effectDeps = ctx.effectDependencies.get(activeEffect) || new Set();
      // Add this effect as a subscriber to the signal
      subscribers.add(new WeakRef(activeEffect));
      // Add this signal to the effect's dependencies
      effectDeps.add(signalFn);
      // Update the context's effect dependencies map
      ctx.effectDependencies.set(activeEffect, effectDeps);
    }
    // Simply return the current value
    return value;
  }) as Signal<T>;

  /**
   * Validates a new value against all registered validators
   * @param newValue - The value to validate
   * @returns Whether the value passed all validators
   */
  const didValidate = (newValue: T): boolean => {
    if (validators.length > 0 && !validators.every((v) => v(newValue))) {
      console.warn(`Validation failed: "${name || "unnamed"}"`, newValue);
      return false;
    }
    return true;
  };

  /**
   * Invokes the onSet callback if provided in options
   * Safely handles any errors in the callback
   * @param newValue - The new value being set
   */
  const tryOnSet = (newValue: T) => {
    if (options?.onSet) {
      try {
        options.onSet(newValue, value);
      } catch (e) {
        console.error(`onSet error: "${name || "unnamed"}"`, e);
      }
    }
  };

  /**
   * Updates the signal value and notifies all subscribers
   * This is the core update mechanism that ensures reactivity
   * @param newValue - The new value to set
   */
  const update = (newValue: T) => {
    tryOnSet(newValue);
    value = newValue;

    // Schedule all dependent effects for execution
    queueEffects(ctx, subscribers);
  };

  /**
   * Direct value setter that validates and updates the signal value
   * This is exposed as the .set() method on the signal
   * @param newValue - The new value to set
   */
  const setter = (newValue: T) => {
    if (!didValidate(newValue)) {
      return;
    }

    // Only update if the value has actually changed
    if (newValue !== value) {
      update(newValue);
    }
  };

  /**
   * Functional updater that accepts a function to compute the new value
   * This is exposed as the .update() method on the signal
   * @param updateFn - Function that receives current value and returns new value
   */
  const updater = (updateFn: (currentValue: T) => T) => {
    const newValue = updateFn(value);
    signalFn.set(newValue);
  };

  // Attach methods and properties to the signal function
  Object.defineProperties(signalFn, {
    _name: { value: name }, // Name for debugging
    _deps: { get: () => subscribers }, // Access to subscribers for debugging/tooling
    set: { value: setter }, // Method to update the signal value
    update: { value: updater }, // Method to update via a function
  });

  return signalFn;
}
