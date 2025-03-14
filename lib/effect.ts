import { getBatchDepth } from "./batch";
import type { CleanupFunction, EffectFn, Signal } from "./types";

// Using a symbolic sentinel instead of null
const NOT_TRACKING = Symbol("not-tracking");
let activeTracker: EffectFn | typeof NOT_TRACKING = NOT_TRACKING;

// Use a more efficient notification queue
const pendingNotifications: EffectFn[] = [];
const pendingRegistry = new Set<EffectFn>();
const executionContext: EffectFn[] = [];

export const getCurrentEffect = (): EffectFn | null =>
  activeTracker === NOT_TRACKING ? null : activeTracker;

export const setCurrentEffect = (value: EffectFn | null): void => {
  activeTracker = value === null ? NOT_TRACKING : value;
};

// Dependency registry with more descriptive name
export const effectDependencies: Map<EffectFn, Set<Signal<any>>> = new Map();

/**
 * Creates an effect that runs when its dependencies change
 */
export function effect(fn: EffectFn): CleanupFunction {
  // Create an observer function
  const observer = () => {
    // Prevent infinite recursion with execution context tracking
    if (executionContext.includes(observer)) {
      console.warn("Circular dependency detected in effect", {
        runningEffectsSize: executionContext.length,
        effectId: observer.toString().substring(0, 50),
      });
      return;
    }

    // Remove prior subscriptions
    unsubscribeDependencies(observer);

    // Establish tracking context
    const previousTracker = activeTracker;
    activeTracker = observer;
    executionContext.push(observer);

    try {
      fn();
    } catch (error) {
      console.error("Error in effect:", error);
    } finally {
      executionContext.pop();
      activeTracker = previousTracker;
    }
  };

  // Create dependency tracking set
  effectDependencies.set(observer, new Set());

  // Execute immediately to establish dependencies
  observer();

  // Return cleanup function
  return () => {
    unsubscribeDependencies(observer);
    pendingRegistry.delete(observer);
    effectDependencies.delete(observer);
  };
}

/**
 * Schedule effects to run after current operations complete
 */
export function queueEffects(effects: Set<EffectFn>): void {
  effects.forEach((effect) => {
    if (!pendingRegistry.has(effect)) {
      pendingRegistry.add(effect);
      pendingNotifications.push(effect);
    }
  });

  if (getBatchDepth() === 0) {
    flushEffects();
  }
}

/**
 * Process all queued effects
 */
export function flushEffects(): void {
  if (pendingNotifications.length > 0) {
    const effectsToRun = [...pendingNotifications];
    pendingNotifications.length = 0;
    pendingRegistry.clear();

    for (const effect of effectsToRun) {
      effect();
    }
  }
}

/**
 * Remove an effect from all its dependencies
 */
function unsubscribeDependencies(effect: EffectFn) {
  const deps = effectDependencies.get(effect);
  if (deps) {
    for (const signal of deps) {
      signal._deps.delete(effect);
    }
    deps.clear();
  }
}
