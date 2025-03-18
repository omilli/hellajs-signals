import { getCurrentContext } from "../context";
import type { EffectFn, Signal, SignalOptions } from "../types";
import { getActiveTracker, queueEffects } from "../utils";

/**
 * Creates a new signal with the given initial value and options.
 * @param value - The initial value of the signal.
 * @param options - Additional options for the signal.
 * @returns The created signal.
 */
export function signal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  // Get the current reactive context
  const ctx = getCurrentContext();
  // Extract options
  const { name, validators = [] } = options || {};
  // Subscribers are effects that depend on this signal
  const subscribers = new Set<WeakRef<EffectFn>>();

  // The base signal function to be returned
  const signalFn = (() => {
    // Get the currently active effect (if any)
    const activeEffect = getActiveTracker(ctx);
    if (activeEffect) {
      // Get or create the set of dependencies for the active effect
      const effectDeps = ctx.effectDependencies.get(activeEffect) || new Set();
      // Add the active effect to the subscribers of this signal
      subscribers.add(new WeakRef(activeEffect));
      // Add this signal to the dependencies of the active effect
      effectDeps.add(signalFn);
      // Update the context's effect dependencies
      ctx.effectDependencies.set(activeEffect, effectDeps);
    }
    // Return the current value when the function is called
    return value;
  }) as Signal<T>;

  // Did pass validation of all validators
  const didValidate = <V extends T>(newValue: V): boolean => {
    if (validators.length > 0 && !validators.every((v) => v(newValue))) {
      console.warn(`Validation failed: "${name || "unnamed"}"`, newValue);
      return false;
    }
    return true;
  };

  // Try to run the onSet callback
  const tryOnSet = <V extends T>(newValue: V) => {
    if (options?.onSet) {
      try {
        options.onSet(newValue, value);
      } catch (e) {
        console.error(`onSet error: "${name || "unnamed"}"`, e);
      }
    }
  };

  // Update the value and notify subscribers
  const update = <V extends T>(newValue: V) => {
    tryOnSet(newValue);
    value = newValue;
    queueEffects(ctx, subscribers);
  };

  // Update new value if it passes validation
  const setter = (newValue: T) => {
    if (!didValidate(newValue)) {
      return;
    }
    if (newValue !== value) {
      update(newValue);
    }
  };

  // Update the value using a function
  const updater = (updateFn: (currentValue: T) => T) => {
    const newValue = updateFn(value);
    signalFn.set(newValue);
  };

  // Define the properties on the signal function
  Object.defineProperties(signalFn, {
    _name: { value: name },
    _deps: { get: () => subscribers },
    set: { value: setter },
    update: { value: updater },
  });

  // Return the signal function
  return signalFn;
}
