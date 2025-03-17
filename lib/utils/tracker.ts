import type { EffectFn, ReactiveState } from "../types";

/**
 * Symbol representing when no tracking is active
 */
export const NOT_TRACKING = Symbol.for("not-tracking");

/**
 * Checks if there's an active tracker (effect or computation)
 */
export function hasActiveTracker(state: ReactiveState): boolean {
  return state.activeTracker !== NOT_TRACKING;
}

/**
 * Gets the active effect tracker
 */
export function getActiveTracker(
  state: ReactiveState
): EffectFn | symbol | null {
  return state.activeTracker === NOT_TRACKING
    ? null
    : (state.activeTracker as EffectFn);
}

/**
 * Sets the active tracker
 */
export function setActiveTracker(
  state: ReactiveState,
  tracker: EffectFn | symbol | null
): void {
  state.activeTracker = tracker === null ? NOT_TRACKING : tracker;
}
