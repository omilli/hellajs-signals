import { getBatchDepth } from "./batch";
import type { CleanupFunction, EffectFn, EffectOptions } from "./types";

// Using a symbolic sentinel instead of null
const NOT_TRACKING = Symbol("not-tracking");
let activeTracker: EffectFn | typeof NOT_TRACKING = NOT_TRACKING;

// Use a more efficient notification queue
const pendingNotifications: EffectFn[] = [];
const pendingRegistry = new Set<EffectFn>();
const executionContext: EffectFn[] = [];

export const getCurrentEffect = (): EffectFn | null =>
  activeTracker === NOT_TRACKING ? null : activeTracker;

export const setCurrentEffect = (value: EffectFn | null): void => {
  activeTracker = value === null ? NOT_TRACKING : value;
};

// Dependency registry with more descriptive name
export const effectDependencies: Map<
  EffectFn,
  Set<{ (): unknown; _deps: Set<WeakRef<EffectFn>> }>
> = new Map();

/**
 * Creates an effect that runs when its dependencies change
 */
export function effect(fn: EffectFn, options?: EffectOptions): CleanupFunction {
  const { name, scheduler, once, debounce, onError, onCleanup } = options || {};

  // Store user's cleanup function if provided
  let userCleanup: (() => void) | undefined = onCleanup;

  // Create an observer function
  const observer = () => {
    // Prevent infinite recursion with execution context tracking
    if (executionContext.includes(observer)) {
      console.warn("Circular dependency detected in effect", {
        runningEffectsSize: executionContext.length,
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
    const previousTracker = activeTracker;
    activeTracker = observer;
    executionContext.push(observer);

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
      executionContext.pop();
      activeTracker = previousTracker;
    }
  };

  // Attach metadata to the observer
  Object.defineProperties(observer, {
    _name: { value: name },
    _hasRun: { value: false, writable: true },
    _priority: { value: options?.priority },
  });

  // Create dependency tracking set
  effectDependencies.set(observer, new Set());

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
    pendingRegistry.delete(observer);
    effectDependencies.delete(observer);
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
  // Clean up dead references while processing
  const deadRefs = new Set<WeakRef<EffectFn>>();

  for (const weakRef of subscribers) {
    const effect = weakRef.deref();
    if (effect) {
      // Effect is alive, queue it
      if (!pendingRegistry.has(effect)) {
        pendingNotifications.push(effect);
        pendingRegistry.add(effect);
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
    // Changed from queueMicrotask to immediate execution for test compatibility
    flushEffects();
  }
}

/**
 * Process all queued effects
 */
export function flushEffects(): void {
  if (pendingNotifications.length > 0) {
    // Sort by priority if available
    const effectsToRun = [...pendingNotifications].sort((a, b) => {
      const priorityA = (a as any)._priority || 0;
      const priorityB = (b as any)._priority || 0;
      return priorityB - priorityA; // Higher priority runs first
    });

    pendingNotifications.length = 0;
    pendingRegistry.clear();

    for (const effect of effectsToRun) {
      effect();
    }
  }
}

/**
 * Remove an effect from all its dependencies
 */
function unsubscribeDependencies(effect: EffectFn) {
  const deps = effectDependencies.get(effect);
  if (deps) {
    for (const signal of deps) {
      // Find and remove the WeakRef pointing to this effect
      const subscribers = signal._deps;
      for (const weakRef of subscribers) {
        const subscribedEffect = weakRef.deref();
        if (!subscribedEffect || subscribedEffect === effect) {
          subscribers.delete(weakRef);
        }
      }
    }
    deps.clear();
    effectDependencies.delete(effect);
  }
}
