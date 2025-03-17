import { hasActiveTracker, getActiveTracker, addDependency } from "./state";
import type { EffectFn, ReactiveState, SignalBase } from "../types";

/**
 * Track the current effect as dependent on a signal
 * This is called when a signal is read within an effect
 * @internal
 */
export function trackDependency(
  state: ReactiveState,
  signal: SignalBase
): void {
  // Only track if there's an active effect
  if (!hasActiveTracker(state)) return;

  const activeEffect = getActiveTracker(state);
  if (!activeEffect) return;

  // Add bidirectional dependency relationship
  // 1. Store signal as a dependency of the active effect
  addDependency(state, activeEffect, signal);

  // 2. Store effect as a dependent of the signal
  signal._deps.add(new WeakRef(activeEffect));
}

/**
 * Notify all effects that depend on a changed signal
 * @internal
 */
export function notifyDependents(
  state: ReactiveState,
  signal: SignalBase
): void {
  // Early return if no pending queue is needed
  if (state.batchDepth === 0 && signal._deps.size === 0) return;

  // Collect subscribers and clean up dead references
  const liveEffects: EffectFn[] = [];
  const deadRefs: WeakRef<EffectFn>[] = [];

  for (const ref of signal._deps) {
    const effect = ref.deref();
    if (effect) {
      liveEffects.push(effect);
    } else {
      deadRefs.push(ref);
    }
  }

  // Clean up garbage collected effect references
  for (const ref of deadRefs) {
    signal._deps.delete(ref);
  }

  // During batching, just collect effects
  if (state.batchDepth > 0) {
    for (const effect of liveEffects) {
      if (!state.pendingRegistry.has(effect)) {
        state.pendingNotifications.push(effect);
        state.pendingRegistry.add(effect);
      }
    }
    return;
  }

  // Not batching, schedule effects to run
  scheduleEffects(state, liveEffects);
}

/**
 * Schedule effects to run with proper priority handling
 * @internal
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
 * Execute all pending effects
 * @internal
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
 * Run an effect with proper error handling and context tracking
 * @internal
 */
function runEffect(state: ReactiveState, effect: EffectFn): void {
  // Guard against circular dependencies
  if (state.executionContext.includes(effect)) {
    console.warn("Circular dependency detected in effect", {
      effectId: (effect as any)._name || "anonymous",
      runningEffectsSize: state.executionContext.length,
    });
    return;
  }

  // Set up tracking context
  const previousTracker = state.activeTracker;
  state.activeTracker = effect;
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
    state.activeTracker = previousTracker;
  }
}
