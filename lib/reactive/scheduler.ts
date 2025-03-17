import { flushPendingEffects } from "./tracking";
import {
  SchedulerMode,
  SchedulerPriority,
  type EffectFn,
  type SchedulerConfig,
  type ReactiveState,
} from "../types";

// Default scheduler configuration
const DEFAULT_CONFIG: SchedulerConfig = {
  defaultMode: SchedulerMode.Microtask,
  batchedUpdates: true,
};

// Current scheduler configuration
let config: SchedulerConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the scheduler behavior
 */
export function configureScheduler(options: Partial<SchedulerConfig>): void {
  config = { ...config, ...options };
}

/**
 * Get current scheduler configuration
 */
export function getSchedulerConfig(): Readonly<SchedulerConfig> {
  return { ...config };
}

// Track microtask and task queues for deduplication
const microtaskQueue = new Set<() => void>();
const taskQueue = new Set<() => void>();
let isMicrotaskScheduled = false;
let isTaskScheduled = false;

// Animation frame tracking
const animationQueue = new Set<() => void>();
let isAnimationFrameScheduled = false;

// Idle callback tracking
const idleQueue = new Set<() => void>();
let isIdleCallbackScheduled = false;

/**
 * Schedule an effect to run with given priority and mode
 */
export function scheduleEffect(
  state: ReactiveState,
  effect: EffectFn,
  priority = SchedulerPriority.Normal,
  mode = config.defaultMode
): void {
  // Set priority on the effect if it doesn't already have one
  if ((effect as any)._priority === undefined) {
    (effect as any)._priority = priority;
  }

  // Check if already in pending registry to avoid duplicate scheduling
  if (state.pendingRegistry.has(effect)) {
    return;
  }

  // Add to pending registry
  state.pendingNotifications.push(effect);
  state.pendingRegistry.add(effect);

  // If batching is active, just queue the effect and return
  if (state.batchDepth > 0) {
    return;
  }

  // Schedule flush based on the requested mode
  scheduleFlush(state, mode);
}

/**
 * Schedule a flush of all pending effects
 */
export function scheduleFlush(
  state: ReactiveState,
  mode = config.defaultMode
): void {
  switch (mode) {
    case SchedulerMode.Sync:
      // Execute effects immediately
      flushPendingEffects(state);
      break;

    case SchedulerMode.Microtask:
      scheduleMicrotask(() => flushPendingEffects(state));
      break;

    case SchedulerMode.Task:
      scheduleTask(() => flushPendingEffects(state));
      break;

    case SchedulerMode.Animation:
      scheduleAnimationFrame(() => flushPendingEffects(state));
      break;

    case SchedulerMode.Idle:
      scheduleIdleCallback(() => flushPendingEffects(state));
      break;

    default:
      // Default to microtask
      scheduleMicrotask(() => flushPendingEffects(state));
  }
}

/**
 * Schedule a callback in the microtask queue
 */
export function scheduleMicrotask(callback: () => void): void {
  microtaskQueue.add(callback);

  if (!isMicrotaskScheduled) {
    isMicrotaskScheduled = true;
    queueMicrotask(() => {
      isMicrotaskScheduled = false;
      const callbacks = Array.from(microtaskQueue);
      microtaskQueue.clear();
      callbacks.forEach((fn) => fn());
    });
  }
}

/**
 * Schedule a callback in the task queue (using setTimeout)
 */
export function scheduleTask(callback: () => void): void {
  taskQueue.add(callback);

  if (!isTaskScheduled) {
    isTaskScheduled = true;
    setTimeout(() => {
      isTaskScheduled = false;
      const callbacks = Array.from(taskQueue);
      taskQueue.clear();
      callbacks.forEach((fn) => fn());
    }, 0);
  }
}

/**
 * Schedule a callback before the next paint
 */
export function scheduleAnimationFrame(callback: () => void): void {
  animationQueue.add(callback);

  if (
    !isAnimationFrameScheduled &&
    typeof requestAnimationFrame === "function"
  ) {
    isAnimationFrameScheduled = true;
    requestAnimationFrame(() => {
      isAnimationFrameScheduled = false;
      const callbacks = Array.from(animationQueue);
      animationQueue.clear();
      callbacks.forEach((fn) => fn());
    });
  } else if (!isAnimationFrameScheduled) {
    // Fallback if requestAnimationFrame is not available
    scheduleTask(callback);
  }
}

/**
 * Schedule a callback during idle time
 */
export function scheduleIdleCallback(callback: () => void): void {
  idleQueue.add(callback);

  if (!isIdleCallbackScheduled && typeof requestIdleCallback === "function") {
    isIdleCallbackScheduled = true;
    requestIdleCallback((deadline) => {
      isIdleCallbackScheduled = false;
      const callbacks = Array.from(idleQueue);
      idleQueue.clear();

      // Process callbacks while we have time or at least one if we're out of time
      let i = 0;
      while (
        i < callbacks.length &&
        (i === 0 || deadline.timeRemaining() > 0)
      ) {
        callbacks[i]();
        i++;
      }

      // If we didn't finish all callbacks, reschedule the remaining ones
      if (i < callbacks.length) {
        callbacks.slice(i).forEach((fn) => scheduleIdleCallback(fn));
      }
    });
  } else if (!isIdleCallbackScheduled) {
    // Fallback if requestIdleCallback is not available
    scheduleTask(callback);
  }
}

/**
 * Create a custom scheduler function
 */
export function createScheduler(
  mode: SchedulerMode = SchedulerMode.Microtask
): (callback: () => void) => void {
  return (callback: () => void) => {
    switch (mode) {
      case SchedulerMode.Sync:
        callback();
        break;
      case SchedulerMode.Microtask:
        scheduleMicrotask(callback);
        break;
      case SchedulerMode.Task:
        scheduleTask(callback);
        break;
      case SchedulerMode.Animation:
        scheduleAnimationFrame(callback);
        break;
      case SchedulerMode.Idle:
        scheduleIdleCallback(callback);
        break;
    }
  };
}
