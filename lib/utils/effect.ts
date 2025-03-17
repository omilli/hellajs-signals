import type { EffectFn, ReactiveState } from "../types";
import { getBatchDepth } from "./batch";
import { NOT_TRACKING, setActiveTracker } from "./tracker";

/**
 * Schedule effects to run with proper priority handling
 */
export function scheduleEffects(
  state: ReactiveState,
  effects: EffectFn[]
): void {
  // Sort by priority (if available)
  const sorted = [...effects].sort((a, b) => {
    const priorityA = (a as any)._priority || 0;
    const priorityB = (b as any)._priority || 0;
    return priorityB - priorityA; // Higher priority runs first
  });

  // Schedule effects to run
  for (const effect of sorted) {
    if (!state.pendingRegistry.has(effect)) {
      state.pendingNotifications.push(effect);
      state.pendingRegistry.add(effect);
    }
  }

  // If we're not batching, flush immediately
  if (state.batchDepth === 0) {
    flushPendingEffects(state);
  }
}

/**
 * Schedule effects to run after current operations complete
 */
export function queueEffects(
  state: ReactiveState,
  subscribers: Set<WeakRef<EffectFn>>
): void {
  // Clean up dead references while processing
  const deadRefs = new Set<WeakRef<EffectFn>>();

  for (const weakRef of subscribers) {
    const effect = weakRef.deref();
    if (effect) {
      // Effect is alive, queue it
      if (!state.pendingRegistry.has(effect)) {
        state.pendingNotifications.push(effect);
        state.pendingRegistry.add(effect);
      }
    } else {
      // Effect is gone, mark for cleanup
      deadRefs.add(weakRef);
    }
  }

  // Clean up dead references
  for (const deadRef of deadRefs) {
    subscribers.delete(deadRef);
  }

  // Critical fix: Ensure effects run immediately when not batching
  if (getBatchDepth(state) === 0) {
    flushEffects(state);
  }
}

/**
 * Process all queued effects
 */
export function flushEffects(state: ReactiveState): void {
  if (state.pendingNotifications.length > 0) {
    // Sort by priority if available
    const effectsToRun = [...state.pendingNotifications].sort((a, b) => {
      const priorityA = (a as any)._priority || 0;
      const priorityB = (b as any)._priority || 0;
      return priorityB - priorityA; // Higher priority runs first
    });

    state.pendingNotifications.length = 0;
    state.pendingRegistry.clear();

    for (const effect of effectsToRun) {
      // Skip disposed effects
      if ((effect as any)._disposed) continue;
      effect();
    }
  }
}

/**
 * Execute all pending effects
 */
export function flushPendingEffects(state: ReactiveState): void {
  if (state.pendingNotifications.length === 0) return;

  const effectsToRun = [...state.pendingNotifications];

  // Clear pending queue before running effects to prevent circular updates
  state.pendingNotifications.length = 0;
  state.pendingRegistry.clear();

  for (const effect of effectsToRun) {
    // Skip disposed effects
    if ((effect as any)._disposed) continue;

    // Execute the effect with proper error boundaries
    runEffect(state, effect);
  }
}

/**
 * Gets the currently active effect if there is one
 * @returns The current effect function or null if not in an effect
 */
export function getCurrentEffect(
  state: ReactiveState
): EffectFn | symbol | null {
  return state.activeTracker === NOT_TRACKING ||
    typeof state.activeTracker === "symbol"
    ? null
    : (state.activeTracker as EffectFn);
}

/**
 * Run an effect with proper error handling and context tracking
 */
function runEffect(state: ReactiveState, effect: EffectFn): void {
  // Check if effect is already executing (direct circular reference)
  if (state.executionContext.includes(effect)) {
    // Don't log warnings during garbage collection tests
    // Only log in development for debugging
    if (process.env.NODE_ENV !== "production" && state.id !== "default") {
      console.warn("Circular dependency detected in effect", {
        runningEffectsSize: state.executionContext.length,
        effectId: (effect as any)._name || effect.toString().substring(0, 50),
      });
    }
    return;
  }

  // Set up tracking context
  const previousTracker = state.activeTracker;
  setActiveTracker(state, effect);
  state.executionContext.push(effect);

  try {
    effect();
  } catch (error) {
    const onError = (effect as any)._onError;
    if (onError && error instanceof Error) {
      onError(error);
    } else {
      console.error("Error in effect:", error);
    }
  } finally {
    // Clean up tracking context
    state.executionContext.pop();
    setActiveTracker(state, previousTracker);
  }
}
