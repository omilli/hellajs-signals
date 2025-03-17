import type { EffectFn, ReactiveState } from "../types";

/**
 * Symbol representing when no tracking is active
 */
export const NOT_TRACKING = Symbol.for("not-tracking");

/**
 * Create a new reactive state object with default values
 */
export function createReactiveState(id: string): ReactiveState {
  return {
    id,
    activeTracker: NOT_TRACKING,
    pendingNotifications: [],
    pendingRegistry: new Set<EffectFn>(),
    executionContext: [],
    effectDependencies: new Map(),
    effects: new Set(),
    signals: new WeakSet(),
    batchDepth: 0,
  };
}

/**
 * Track the currently active reactive state for dependency tracking
 */
let currentReactiveState: ReactiveState | null = null;

/**
 * Get the currently active reactive state
 */
export function getCurrentState(): ReactiveState {
  if (!currentReactiveState) {
    throw new Error("No active reactive state available");
  }
  return currentReactiveState;
}

/**
 * Set the currently active reactive state
 */
export function setCurrentState(state: ReactiveState | null): void {
  currentReactiveState = state;
}

/**
 * Run a function with a specific reactive state as the active state
 */
export function withState<T>(state: ReactiveState, fn: () => T): T {
  const prevState = currentReactiveState;
  currentReactiveState = state;
  try {
    return fn();
  } finally {
    currentReactiveState = prevState;
  }
}

/**
 * Checks if there's an active tracker (effect or computation)
 */
export function hasActiveTracker(state: ReactiveState): boolean {
  return state.activeTracker !== NOT_TRACKING;
}

/**
 * Gets the active effect tracker
 */
export function getActiveTracker(state: ReactiveState): EffectFn | null {
  return state.activeTracker === NOT_TRACKING
    ? null
    : (state.activeTracker as EffectFn);
}

/**
 * Sets the active tracker
 */
export function setActiveTracker(
  state: ReactiveState,
  tracker: EffectFn | null
): void {
  state.activeTracker = tracker === null ? NOT_TRACKING : tracker;
}

/**
 * Starts a batch operation
 */
export function startBatch(state: ReactiveState): void {
  state.batchDepth++;
}

/**
 * Ends a batch operation
 */
export function endBatch(state: ReactiveState): boolean {
  if (state.batchDepth > 0) {
    state.batchDepth--;
    return state.batchDepth === 0;
  }
  return false;
}

/**
 * Get the current batch depth
 */
export function getBatchDepth(state: ReactiveState): number {
  return state.batchDepth;
}

/**
 * Add a dependency relationship between an effect and a reactive source
 */
export function addDependency(
  state: ReactiveState,
  effect: EffectFn,
  source: any
): void {
  // Add source to effect's dependencies
  const deps = state.effectDependencies.get(effect) || new Set();
  deps.add(source);
  state.effectDependencies.set(effect, deps);
}

/**
 * Clear all dependencies for an effect
 */
export function clearDependencies(
  state: ReactiveState,
  effect: EffectFn
): void {
  const deps = state.effectDependencies.get(effect);
  if (deps) {
    deps.clear();
  }
}
