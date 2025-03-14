import { getBatchDepth } from "./batch";
import type { DisposeFunction, EffectFn, Signal } from "./types";

// Track the currently executing effect
let currentEffect: EffectFn | null;

let pendingEffects: Set<EffectFn> = new Set<EffectFn>();
// Tracking for circular dependencies
let runningEffects: Set<EffectFn> = new Set<EffectFn>();

export const getCurrentEffect = (): EffectFn | null => currentEffect;

export const setCurrentEffect = (value: EffectFn | null): void => {
  currentEffect = value;
};

// Map to track effect dependencies for bidirectional reference
export const effectDependencies: Map<EffectFn, Set<Signal<any>>> = new Map<
  EffectFn,
  Set<Signal<any>>
>();

/**
 * Creates an effect that runs when its dependencies change
 * Returns a function that can be called to dispose the effect
 */
export function effect(fn: EffectFn): DisposeFunction {
  // Effect function wrapper that sets current effect and runs the function
  const effectFn = () => {
    // Prevent circular dependencies
    if (runningEffects.has(effectFn)) {
      console.warn("Circular dependency detected in effect", {
        effectId: String(effectFn).slice(0, 50),
        runningEffectsSize: runningEffects.size,
      });
      return;
    }

    // Clean up old dependencies (efficiently using bidirectional tracking)
    cleanupEffect(effectFn);

    // Track and run the effect
    const prevEffect = currentEffect;
    currentEffect = effectFn;
    runningEffects.add(effectFn);

    try {
      fn();
    } catch (error) {
      console.error("Error in effect:", error);
    } finally {
      runningEffects.delete(effectFn);
      currentEffect = prevEffect;
    }
  };

  // Ensure clean initialization of dependencies
  effectDependencies.set(effectFn, new Set());

  // Run the effect once immediately
  effectFn();

  // Return a dispose function
  return (): void => {
    cleanupEffect(effectFn);
    pendingEffects.delete(effectFn);
    effectDependencies.delete(effectFn);
  };
}

/**
 * Queue effects to run after the current batch completes
 * with deduplication built-in through the Set data structure
 */
export function queueEffects(effects: Set<EffectFn>): void {
  effects.forEach((effect) => {
    pendingEffects.add(effect);
  });

  if (getBatchDepth() === 0) {
    flushEffects();
  }
}

/**
 * Run all pending effects
 * Could be enhanced to prioritize based on dependency graph
 */
export function flushEffects(): void {
  if (pendingEffects.size > 0) {
    const effectsToRun = [...pendingEffects];
    pendingEffects.clear();

    effectsToRun.forEach((effect) => {
      effect();
    });
  }
}

/**
 * Efficiently removes an effect from all signals it was depending on
 * using bidirectional references
 */
function cleanupEffect(effect: EffectFn) {
  // Get the signals this effect depends on
  const deps = effectDependencies.get(effect);

  if (deps) {
    // Remove the effect from each signal's dependencies
    deps.forEach((signal) => {
      signal._deps.delete(effect);
    });

    // Clear the dependencies
    deps.clear();
  }
}
