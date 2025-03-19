import type { ContextState, EffectFn } from "../types";
import { NOT_TRACKING } from "../utils/tracker";

/**
 * Create a new reactive state object with default values
 */
export function createReactiveState(id: string): ContextState {
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
		currentExecutingEffect: null,
		parentChildEffectsMap: new WeakMap(),
	};
}
