import { effectDependencies, getCurrentEffect, queueEffects } from "./effect";
import type { EffectFn, Signal } from "./types";

/**
 * Creates a signal with the given initial value
 */
export function signal<T>(initialValue: T): Signal<T> {
  const sig = Object.assign(
    function () {
      const currentEffect = getCurrentEffect();
      // Track this signal as a dependency of the current effect
      if (currentEffect) {
        sig._deps.add(currentEffect);

        // Store signal in the effect's dependencies for bidirectional tracking
        let deps = effectDependencies.get(currentEffect);
        if (!deps) {
          deps = new Set();
          effectDependencies.set(currentEffect, deps);
        }
        deps.add(sig);
      }
      return sig._value;
    },
    {
      _value: initialValue,
      _deps: new Set<EffectFn>(),
      set: (newValue: T) => {
        if (newValue !== sig._value) {
          sig._value = newValue;
          // Notify all dependent effects
          queueEffects(sig._deps);
        }
      },
    }
  ) as Signal<T>;

  return sig;
}
