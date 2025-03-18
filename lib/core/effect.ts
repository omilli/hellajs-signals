import { getCurrentContext } from "../context";
import type { EffectFn, EffectOptions } from "../types";
import { setActiveTracker } from "../utils";
import { unsubscribeDependencies } from "../utils/dependency";

// Track parent-child relationships between effects
const parentChildEffectsMap = new WeakMap<EffectFn, Set<EffectFn>>();
// Keep track of the current executing parent effect
let currentExecutingEffect: EffectFn | null = null;

/**
 * Creates an effect that runs when its dependencies change
 */

export function effect(fn: EffectFn, options?: EffectOptions): EffectFn {
	const ctx = getCurrentContext();
	const { name, scheduler, once, debounce, onError, onCleanup } = options || {};

	// Store user's cleanup function if provided
	let userCleanup: (() => void) | undefined = onCleanup;

	// For debouncing
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let isFirstRun = true;

	const scheduleRun = (runFn: () => void) => {
		if (scheduler) {
			scheduler(runFn);
		} else {
			runFn();
		}
	};

	// Create an observer function
	const observer: EffectFn = () => {
		// Prevent infinite recursion with execution context tracking
		if (observer._disposed) {
			return;
		}

		if (ctx.executionContext.includes(observer)) {
			console.warn("Circular dependency detected in effect", {
				runningEffectsSize: ctx.executionContext.length,
				effectId: name || observer.toString().substring(0, 50),
			});
			return;
		}

		// If this is a "once" effect that has already run, don't run again
		if (once && (observer as EffectFn)._hasRun) {
			return;
		}

		// Handle debouncing for non-initial runs
		if (debounce && debounce > 0 && !isFirstRun) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => scheduleRun(executeEffectCore), debounce);
			return;
		}

		// For first run or non-debounced runs, execute immediately
		isFirstRun = false;

		// Use the scheduler for all effect executions
		scheduleRun(executeEffectCore);
	};

	// Core function to execute the effect
	// Core function to execute the effect
	const executeEffectCore = () => {
		// Remove prior subscriptions
		unsubscribeDependencies(observer);

		// Establish tracking context
		const previousTracker = ctx.activeTracker;
		const previousParentEffect = currentExecutingEffect;

		// Set this effect as the current executing effect
		currentExecutingEffect = disposeEffect;

		setActiveTracker(ctx, observer);
		ctx.executionContext.push(observer);

		try {
			const result = fn() as void | Promise<void> | (() => void);

			// Handle the case where the effect returns a cleanup function
			if (typeof result === "function") {
				userCleanup = result;
			}
			// Handle async functions that return promises
			else if (result instanceof Promise) {
				result.catch((error) => {
					if (onError && error instanceof Error) {
						onError(error);
					} else {
						console.error("Error in async effect:", error);
					}
				});
			}

			// Mark as having run at least once (for "once" option)
			if (once) {
				(observer as EffectFn)._hasRun = true;
			}
		} catch (error) {
			if (onError && error instanceof Error) {
				onError(error);
			} else {
				console.error("Error in effect:", error);
			}
		} finally {
			ctx.executionContext.pop();
			setActiveTracker(ctx, previousTracker);
			// Restore previous parent effect
			currentExecutingEffect = previousParentEffect;
		}
	};

	// Attach metadata to the observer
	Object.defineProperties(observer, {
		_name: { value: name },
		_hasRun: { value: false, writable: true },
		_priority: { value: options?.priority },
		_disposed: { value: false, writable: true },
	});

	// Create dependency tracking set - both in context and global store
	ctx.effectDependencies.set(observer, new Set());

	// Create the disposal function
	const disposeEffect = () => {
		// Cancel any pending debounced execution
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = undefined;
		}

		// Mark as disposed immediately to prevent any future executions
		observer._disposed = true;

		// Dispose all child effects first
		const childEffects = parentChildEffectsMap.get(disposeEffect);
		if (childEffects) {
			for (const childDispose of childEffects) {
				childDispose();
			}
			childEffects.clear();
			parentChildEffectsMap.delete(disposeEffect);
		}

		if (userCleanup) {
			try {
				userCleanup();
			} catch (error) {
				console.error("Error in effect cleanup:", error);
			}
		}

		// Remove from pending notifications if it's queued
		const pendingIndex = ctx.pendingNotifications.findIndex(
			(e) => e === observer || e._effect === observer || observer._effect === e,
		);

		if (pendingIndex !== -1) {
			ctx.pendingNotifications.splice(pendingIndex, 1);
		}

		unsubscribeDependencies(observer);
		ctx.pendingRegistry.delete(observer);
		ctx.effectDependencies.delete(observer);
	};

	Object.defineProperties(disposeEffect, {
		_name: { value: name },
		_effect: { value: observer },
	});

	if (currentExecutingEffect) {
		let parentChildEffects = parentChildEffectsMap.get(currentExecutingEffect);
		if (!parentChildEffects) {
			parentChildEffects = new Set();
			parentChildEffectsMap.set(currentExecutingEffect, parentChildEffects);
		}
		parentChildEffects.add(disposeEffect);
	}

	// Handle custom scheduling or immediate execution
	if (scheduler) {
		scheduler(observer);
	} else {
		observer(); // Initial execution
	}

	// Return cleanup function
	return disposeEffect;
}
