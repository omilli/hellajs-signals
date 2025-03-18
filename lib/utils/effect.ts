import type { EffectFn, ReactiveState } from "../types";
import { NOT_TRACKING } from "./tracker";

/**
 * Schedule effects to run with proper priority handling
 */
export function scheduleEffects(
	state: ReactiveState,
	effects: EffectFn[],
): void {
	// Sort by priority (if available)
	const sorted = [...effects].sort((a, b) => {
		const priorityA = a._priority || 0;
		const priorityB = b._priority || 0;
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
		flushEffects(state);
	}
}

/**
 * Schedule effects to run after current operations complete
 */
export function queueEffects(
	state: ReactiveState,
	subscribers: Set<WeakRef<EffectFn>>,
): void {
	if (subscribers.size === 0) return;

	// Efficient deduplication using the pending registry
	let hasQueuedEffects = false;

	// Process subscribers, cleaning up dead references
	for (const ref of subscribers) {
		const effect = ref.deref();
		if (effect) {
			// Only queue if not already pending
			if (!state.pendingRegistry.has(effect)) {
				state.pendingNotifications.push(effect);
				state.pendingRegistry.add(effect);
				hasQueuedEffects = true;
			}
		} else {
			// Clean up dead reference
			subscribers.delete(ref);
		}
	}

	// Run effects immediately if not batching and we have queued effects
	if (state.batchDepth === 0 && hasQueuedEffects) {
		flushEffects(state);
	}
}

/**
 * Process all queued effects
 */
export function flushEffects(state: ReactiveState): void {
	if (state.pendingNotifications.length === 0) return;

	// Sort by priority (higher runs first)
	const effectsToRun = [...state.pendingNotifications].sort((a, b) => {
		return (b._priority || 0) - (a._priority || 0);
	});

	// Clear pending notifications before running effects to avoid cycles
	state.pendingNotifications.length = 0;
	state.pendingRegistry.clear();

	// Run each effect, skipping disposed ones
	for (const effect of effectsToRun) {
		if (!effect._disposed) {
			effect();
		}
	}
}

/**
 * Gets the currently active effect if there is one
 * @returns The current effect function or null if not in an effect
 */
export function getCurrentEffect(state: ReactiveState): EffectFn | null {
	return state.activeTracker === NOT_TRACKING ||
		typeof state.activeTracker === "symbol"
		? null
		: (state.activeTracker as EffectFn);
}
