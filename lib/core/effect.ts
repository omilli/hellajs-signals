import type { CleanupFunction, EffectFn, EffectOptions } from "../types";
import { getCurrentContext } from "../context";
import { getBatchDepth, NOT_TRACKING } from "../reactive";

// Context accessor functions to replace global state
export const setCurrentEffect = (value: EffectFn | null): void => {
  const ctx = getCurrentContext();
  ctx.activeTracker = value === null ? NOT_TRACKING : value;
};

/**
 * Gets the currently active effect if there is one
 * @returns The current effect function or null if not in an effect
 */
export function getCurrentEffect(): EffectFn | null {
  const ctx = getCurrentContext();
  return ctx.activeTracker === NOT_TRACKING ||
    typeof ctx.activeTracker === "symbol"
    ? null
    : (ctx.activeTracker as EffectFn);
}

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

/**
 * Schedule effects to run after current operations complete
 */
export function queueEffects(subscribers: Set<WeakRef<EffectFn>>): void {
  const ctx = getCurrentContext();

  // Clean up dead references while processing
  const deadRefs = new Set<WeakRef<EffectFn>>();

  for (const weakRef of subscribers) {
    const effect = weakRef.deref();
    if (effect) {
      // Effect is alive, queue it
      if (!ctx.pendingRegistry.has(effect)) {
        ctx.pendingNotifications.push(effect);
        ctx.pendingRegistry.add(effect);
      }
    } else {
      // Effect is gone, mark for cleanup
      deadRefs.add(weakRef);
    }
  }

  // Clean up dead references
  for (const deadRef of deadRefs) {
    subscribers.delete(deadRef);
  }

  // Critical fix: Ensure effects run immediately when not batching
  if (getBatchDepth(ctx) === 0) {
    flushEffects();
  }
}

/**
 * Process all queued effects
 */
export function flushEffects(): void {
  const ctx = getCurrentContext();

  if (ctx.pendingNotifications.length > 0) {
    // Sort by priority if available
    const effectsToRun = [...ctx.pendingNotifications].sort((a, b) => {
      const priorityA = (a as any)._priority || 0;
      const priorityB = (b as any)._priority || 0;
      return priorityB - priorityA; // Higher priority runs first
    });

    ctx.pendingNotifications.length = 0;
    ctx.pendingRegistry.clear();

    for (const effect of effectsToRun) {
      // Skip disposed effects
      if ((effect as any)._disposed) continue;
      effect();
    }
  }
}

/**
 * Remove an effect from all its dependencies
 */
function unsubscribeDependencies(effect: EffectFn) {
  const ctx = getCurrentContext();

  // Get dependencies from both context-specific storage
  const ctxDeps = ctx.effectDependencies.get(effect);

  // Thorough cleanup of dependency sets
  const allDeps = new Set([...(ctxDeps || [])]);

  // For each signal this effect depends on, remove the effect from its subscribers
  for (const signal of allDeps) {
    if (signal && signal._deps) {
      const subscribers = signal._deps;
      // Create array of refs to remove so we can modify while iterating
      const refsToRemove = [];

      for (const weakRef of subscribers) {
        const subscribedEffect = weakRef.deref();
        // Enhanced comparison - also check if this is the same observer function via _effect property
        if (
          !subscribedEffect ||
          subscribedEffect === effect ||
          (subscribedEffect as any)._effect === effect ||
          (effect as any)._effect === subscribedEffect
        ) {
          refsToRemove.push(weakRef);
        }
      }

      // Now remove all the marked refs
      for (const ref of refsToRemove) {
        subscribers.delete(ref);
      }
    }
  }

  // Clear and delete from context tracking
  if (ctxDeps) {
    ctxDeps.clear();
    ctx.effectDependencies.delete(effect);
  }
}
