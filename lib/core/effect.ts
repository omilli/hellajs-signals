import type { CleanupFunction, EffectFn, EffectOptions } from "../types";
import { getCurrentContext } from "../context";
import { unsubscribeDependencies } from "../utils/dependency";

/**
 * Creates an effect that runs when its dependencies change
 */
export function effect(fn: EffectFn, options?: EffectOptions): CleanupFunction {
  const ctx = getCurrentContext();
  const { name, scheduler, once, debounce, onError, onCleanup } = options || {};

  // Store user's cleanup function if provided
  let userCleanup: (() => void) | undefined = onCleanup;

  // Create an observer function
  const observer = () => {
    // Prevent infinite recursion with execution context tracking
    if ((observer as any)._disposed) {
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

    // Remove prior subscriptions
    unsubscribeDependencies(observer);

    // Establish tracking context
    const previousTracker = ctx.activeTracker;
    ctx.activeTracker = observer;
    ctx.executionContext.push(observer);

    try {
      fn();
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
      ctx.activeTracker = previousTracker;
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

  // Handle scheduling of the initial effect
  const executeEffect = () => {
    // Execute immediately to establish dependencies
    observer();

    // If once option is set, dispose after first run
    if (once) {
      disposeEffect();
    }
  };

  // Create the disposal function
  const disposeEffect = () => {
    // Mark as disposed immediately to prevent any future executions
    (observer as any)._disposed = true;

    if (userCleanup) {
      try {
        userCleanup();
      } catch (error) {
        console.error("Error in effect cleanup:", error);
      }
    }

    // Remove from pending notifications if it's queued
    const pendingIndex = ctx.pendingNotifications.findIndex(
      (e) =>
        e === observer ||
        (e as any)._effect === observer ||
        (observer as any)._effect === e
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

  // Handle custom scheduling or debouncing
  if (scheduler) {
    // Use custom scheduler
    scheduler(executeEffect);
  } else if (debounce && debounce > 0) {
    // Use debouncing
    let timeoutId: number | undefined;
    let isInitialRun = true;

    if (isInitialRun) {
      executeEffect();
      isInitialRun = false;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(executeEffect, debounce) as unknown as number;
    }
  } else {
    // Default immediate execution
    executeEffect();
  }

  // Return cleanup function
  return disposeEffect;
}
