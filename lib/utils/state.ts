import type { EffectFn, ReactiveState } from "../types";
import { NOT_TRACKING } from "../utils/tracker";

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
