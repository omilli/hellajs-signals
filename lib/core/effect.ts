import { getCurrentContext } from "../context";
import type { ContextState, EffectFn, EffectOptions } from "../types";
import { setActiveTracker } from "../utils";
import { unsubscribeDependencies } from "../utils/dependency";

/**
 * Creates an effect that runs when its dependencies change.
 * Effects automatically track reactive dependencies used within the effect function
 * and re-execute when those dependencies change.
 *
 * @param fn - The function to execute when dependencies change
 * @param options - Optional configuration for the effect behavior
 * @returns A dispose function that can be called to clean up the effect
 */
export function effect(fn: EffectFn, options?: EffectOptions): EffectFn {
	const ctx = getCurrentContext();
	const { name, scheduler, once, debounce, onError, onCleanup } = options || {};

	// Store user's cleanup function if provided
	let userCleanup: (() => void) | undefined = onCleanup;

	// For debouncing
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let isFirstRun = true;

	/**
	 * Schedules effect execution using the provided scheduler or runs it directly
	 */
	const scheduleRun = (runFn: () => void) => {
		if (scheduler) {
			scheduler(runFn);
		} else {
			runFn();
		}
	};

	/**
	 * Manages debouncing and schedules the effect's execution
	 */
	const handleEffectScheduling = () => {
		const skipWhen = [
			observer._disposed,
			detectCircularDependency(),
			shouldSkipOnceEffect(),
			shouldDebounce(),
		];

		if (skipWhen.some(Boolean)) {
			return;
		}

		// For first run or non-debounced runs
		isFirstRun = false;

		// Use the scheduler for effect execution
		scheduleRun(executeEffectCore);
	};

	/**
	 * Checks if the effect is creating a circular dependency
	 */
	const detectCircularDependency = (): boolean => {
		if (ctx.executionContext.includes(observer)) {
			console.warn("Circular dependency detected in effect", {
				runningEffectsSize: ctx.executionContext.length,
				effectId: name || observer.toString().substring(0, 50),
			});
			return true;
		}
		return false;
	};

	/**
	 * Determines if a "once" effect should be skipped
	 */
	const shouldSkipOnceEffect = (): boolean => {
		return Boolean(once && (observer as EffectFn)._hasRun);
	};

	/**
	 * Handles debouncing logic and returns whether execution should be deferred
	 */
	const shouldDebounce = (): boolean => {
		if (debounce && debounce > 0 && !isFirstRun) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => scheduleRun(executeEffectCore), debounce);
			return true;
		}
		return false;
	};

	/**
	 * Core function to execute the effect with proper tracking setup
	 */
	const executeEffectCore = () => {
		// Remove prior subscriptions
		unsubscribeDependencies(observer);

		// Establish tracking context
		const previousTracker = ctx.activeTracker;
		const previousParentEffect = ctx.currentExecutingEffect;

		// Set this effect as the current executing effect
		ctx.currentExecutingEffect = disposeEffect;

		setActiveTracker(ctx, observer);
		ctx.executionContext.push(observer);

		try {
			const result = fn() as void | Promise<void> | (() => void);
			handleEffectResult(result);
		} catch (error) {
			handleEffectError(error);
		} finally {
			// Restore previous context
			ctx.executionContext.pop();
			setActiveTracker(ctx, previousTracker);
			ctx.currentExecutingEffect = previousParentEffect;
		}
	};

	/**
	 * Handles the result returned by the effect function
	 */
	const handleEffectResult = (result: void | Promise<void> | (() => void)) => {
		// Handle the case where the effect returns a cleanup function
		if (typeof result === "function") {
			userCleanup = result;
		}
		// Handle async functions that return promises
		else if (result instanceof Promise) {
			result.catch((error) => {
				handleEffectError(error);
			});
		}

		// Mark as having run at least once (for "once" option)
		if (once) {
			(observer as EffectFn)._hasRun = true;
		}
	};

	/**
	 * Handles errors that occur during effect execution
	 */
	const handleEffectError = (error: unknown) => {
		if (onError && error instanceof Error) {
			onError(error);
		} else {
			console.error("Error in effect:", error);
		}
	};

	// Create an observer function
	const observer: EffectFn = () => handleEffectScheduling();

	// Attach metadata to the observer
	Object.defineProperties(observer, {
		_name: { value: name },
		_hasRun: { value: false, writable: true },
		_priority: { value: options?.priority },
		_disposed: { value: false, writable: true },
	});

	// Create dependency tracking set in context
	ctx.effectDependencies.set(observer, new Set());

	/**
	 * Handles cleanup of all resources associated with the effect
	 */
	const disposeEffect = () => {
		// Cancel any pending debounced execution
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = undefined;
		}

		// Mark as disposed immediately to prevent any future executions
		observer._disposed = true;

		// Dispose all child effects first
		disposeChildEffects();

		// Run user cleanup if provided
		runUserCleanup();

		// Remove from pending notifications if it's queued
		removeFromPendingQueue();

		// Clean up all dependencies and registries
		unsubscribeDependencies(observer);
		ctx.pendingRegistry.delete(observer);
		ctx.effectDependencies.delete(observer);
	};

	/**
	 * Disposes any child effects created by this effect
	 */
	const disposeChildEffects = () => {
		const childEffects = ctx.parentChildEffectsMap.get(disposeEffect);
		if (childEffects) {
			for (const childDispose of childEffects) {
				childDispose();
			}
			childEffects.clear();
			ctx.parentChildEffectsMap.delete(disposeEffect);
		}
	};

	/**
	 * Executes user-provided cleanup function safely
	 */
	const runUserCleanup = () => {
		if (userCleanup) {
			try {
				userCleanup();
			} catch (error) {
				console.error("Error in effect cleanup:", error);
			}
		}
	};

	/**
	 * Removes the effect from the pending notifications queue
	 */
	const removeFromPendingQueue = () => {
		const pendingIndex = ctx.pendingNotifications.findIndex(
			(e) => e === observer || e._effect === observer || observer._effect === e,
		);

		if (pendingIndex !== -1) {
			ctx.pendingNotifications.splice(pendingIndex, 1);
		}
	};

	// Add metadata to the dispose function
	Object.defineProperties(disposeEffect, {
		_name: { value: name },
		_effect: { value: observer },
	});

	// Register parent-child relationship for automatic cleanup
	registerParentChildRelationship(ctx, disposeEffect);

	// Handle custom scheduling or immediate execution
	if (scheduler) {
		scheduler(observer);
	} else {
		observer(); // Initial execution
	}

	// Return cleanup function
	return disposeEffect;
}

/**
 * Registers a parent-child relationship between effects.
 * When a dispose effect is executed within another effect (the parent),
 * this function establishes a connection between them by storing the relationship
 * in a map structure.
 *
 * @param disposeEffect - The effect function to be registered as a child of the currently executing effect
 * @remarks
 * This function only operates when there is a currently executing effect (parent).
 * If no effect is currently executing, the function does nothing.
 */
function registerParentChildRelationship(
	ctx: ContextState,
	disposeEffect: EffectFn,
) {
	if (ctx.currentExecutingEffect) {
		let parentChildEffects = ctx.parentChildEffectsMap.get(
			ctx.currentExecutingEffect,
		);
		if (!parentChildEffects) {
			parentChildEffects = new Set();
			ctx.parentChildEffectsMap.set(
				ctx.currentExecutingEffect,
				parentChildEffects,
			);
		}
		parentChildEffects.add(disposeEffect);
	}
}
