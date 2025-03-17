import { getCurrentContext } from "../context";
import type { EffectFn, Signal, SignalOptions } from "../types";
import { getActiveTracker, queueEffects } from "../utils";

/**
 * Creates a reactive signal with the specified initial value.
 */
export function signal<T>(
  initialValue: T,
  options?: SignalOptions<T>
): Signal<T> {
  const ctx = getCurrentContext();
  const validators = options?.validators || [];
  const name = options?.name;

  // Store value directly in closure instead of separate object
  let value = initialValue;

  // Use WeakSet for better garbage collection
  const subscribers = new Set<WeakRef<EffectFn>>();

  const signalFn = function () {
    const activeEffect = getActiveTracker(ctx);
    if (activeEffect) {
      // Add the active effect to this signal's subscribers
      subscribers.add(new WeakRef(activeEffect));

      // Add signal to effect's dependencies
      const effectDeps = ctx.effectDependencies.get(activeEffect) || new Set();
      effectDeps.add(signalFn);
      ctx.effectDependencies.set(activeEffect, effectDeps);
    }
    return value;
  } as Signal<T>;

  // Define read-only properties and methods
  Object.defineProperties(signalFn, {
    _name: { value: name },
    _deps: { get: () => subscribers },

    set: {
      value: (newValue: T) => {
        // Validator checks
        if (validators.length > 0 && !validators.every((v) => v(newValue))) {
          console.warn(
            `Validation failed for signal "${name || "unnamed"}"`,
            newValue
          );
          return;
        }

        const oldValue = value;
        if (newValue !== oldValue) {
          // Simple equality check for performance
          value = newValue;

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

          queueEffects(ctx, subscribers);
        }
      },
    },

    update: {
      value: (updater: (currentValue: T) => T) => {
        const newValue = updater(value);
        signalFn.set(newValue);
      },
    },
  });

  return signalFn;
}
