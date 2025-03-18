import type { ContextState, EffectFn } from "../types";

/**
 * Symbol representing when no tracking is active
 */
export const NOT_TRACKING = Symbol.for("not-tracking");

/**
 * Checks if there's an active tracker (effect or computation)
 */
export function hasActiveTracker(state: ContextState): boolean {
	return state.activeTracker !== NOT_TRACKING;
}

/**
 * Gets the active effect tracker
 */
export function getActiveTracker(state: ContextState): EffectFn | null {
	return state.activeTracker === NOT_TRACKING
		? null
		: (state.activeTracker as EffectFn);
}

/**
 * Sets the active tracker
 */
export function setActiveTracker(
	state: ContextState,
	tracker: EffectFn | symbol | null,
): void {
	state.activeTracker = tracker === null ? NOT_TRACKING : tracker;
}
