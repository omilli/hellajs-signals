import { getBatchDepth } from "./batch";
import type { CleanupFunction, EffectFn, EffectOptions } from "./types";
import { getCurrentContext, NOT_TRACKING } from "./context";

// Context accessor functions to replace global state
export const setCurrentEffect = (value: EffectFn | null): void => {
  const ctx = getCurrentContext();
  ctx.activeTracker = value === null ? NOT_TRACKING : value;
};

// Re-export the getCurrentEffect from context for backward compatibility
export { getCurrentEffect } from "./context";

// For backward compatibility and test compatibility
// We maintain this alongside context-specific storage
export const effectDependencies: Map<
  EffectFn,
  Set<{ (): unknown; _deps: Set<WeakRef<EffectFn>> }>
> = new Map();

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
  });

  // Create dependency tracking set - both in context and global store
  ctx.effectDependencies.set(observer, new Set());
  effectDependencies.set(observer, new Set()); // For backward compatibility

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
    if (userCleanup) {
      try {
        userCleanup();
      } catch (error) {
        console.error("Error in effect cleanup:", error);
      }
    }

    unsubscribeDependencies(observer);
    ctx.pendingRegistry.delete(observer);
    ctx.effectDependencies.delete(observer);
    effectDependencies.delete(observer); // Clean up the global store too
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
  if (getBatchDepth() === 0) {
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
      effect();
    }
  }
}

/**
 * Remove an effect from all its dependencies
 */
function unsubscribeDependencies(effect: EffectFn) {
  const ctx = getCurrentContext();

  // Get dependencies from both context-specific and global storage
  const ctxDeps = ctx.effectDependencies.get(effect);
  const globalDeps = effectDependencies.get(effect);

  // Thorough cleanup of both dependency sets
  const allDeps = new Set([...(ctxDeps || []), ...(globalDeps || [])]);

  // For each signal this effect depends on, remove the effect from its subscribers
  for (const signal of allDeps) {
    if (signal && signal._deps) {
      const subscribers = signal._deps;
      for (const weakRef of subscribers) {
        const subscribedEffect = weakRef.deref();
        if (!subscribedEffect || subscribedEffect === effect) {
          subscribers.delete(weakRef);
        }
      }
    }
  }

  // Clear and delete from both context and global tracking
  if (ctxDeps) {
    ctxDeps.clear();
    ctx.effectDependencies.delete(effect);
  }

  if (globalDeps) {
    globalDeps.clear();
    effectDependencies.delete(effect);
  }
}
