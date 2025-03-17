export interface SignalBase {
  (): unknown;
  _deps: Set<WeakRef<EffectFn>>;
}

export interface SignalValue<T> {
  (): T;
  _cleanup: () => void;
  _isComputed: boolean;
}

export type SignalSetter<T> = (value: T) => void;

export interface Signal<T> {
  (): T;
  set: SignalSetter<T>;
  update: (updater: (value: T) => T) => void;
  _value: T;
  _deps: Set<WeakRef<EffectFn>>;
}

export interface EffectFn {
  (): void;
  _hasRun?: boolean;
  _name?: string;
  _priority?: number;
}

export interface EffectOptions {
  name?: string; // For debugging and DevTools
  scheduler?: (run: () => void) => void; // Custom scheduling
  priority?: number; // Execution order (higher runs first)
  once?: boolean; // Run once and dispose automatically
  debounce?: number; // Wait time before executing
  onError?: (error: Error) => void; // Custom error handling
  onCleanup?: () => void; // Alternative cleanup registration
}

export type ComputedFn<T> = () => T;

export type CleanupFunction = () => void;

export interface SignalOptions<T> {
  name?: string;
  validators?: Array<(value: T) => boolean>;
  onSet?: (newValue: unknown, oldValue: unknown) => void;
}

export interface ReactiveContext {
  signal: <T>(initialValue: T, options?: SignalOptions<T>) => Signal<T>;
  effect: (fn: EffectFn, options?: EffectOptions) => CleanupFunction;
  computed: <T>(deriveFn: ComputedFn<T>) => SignalValue<T>;
  batch: <T>(fn: () => T) => T;
  untracked: <T>(fn: () => T) => T;
}

// New interface to represent reactive state for a context
export interface ReactiveState {
  id: string;
  activeTracker: EffectFn | symbol;
  pendingNotifications: EffectFn[];
  pendingRegistry: Set<EffectFn>;
  executionContext: EffectFn[];
  effectDependencies: Map<EffectFn, Set<any>>;
  effects: Set<CleanupFunction>;
  signals: WeakSet<any>;
  batchDepth: number; // Add batchDepth to track batching state per context
}

// Define the types for the injected dependencies
export interface ReactiveContextDependencies {
  signal: <T>(initialValue: T, options?: SignalOptions<T>) => Signal<T>;
  effect: (fn: EffectFn, options?: EffectOptions) => CleanupFunction;
  computed: <T>(deriveFn: ComputedFn<T>) => SignalValue<T>;
  batch: <T>(fn: () => T) => T;
  untracked: <T>(fn: () => T) => T;
}

/**
 * Scheduling priority levels
 * @internal
 */
export enum SchedulerPriority {
  High = 3, // For critical UI updates
  Normal = 2, // Default priority
  Low = 1, // Background tasks
  Idle = 0, // Only run when nothing else is pending
}

/**
 * Different scheduling strategies available
 * @internal
 */
export enum SchedulerMode {
  Sync, // Run immediately (synchronously)
  Microtask, // Use queueMicrotask (after current task, before next task)
  Task, // Use setTimeout (after other microtasks, in next task)
  Animation, // Use requestAnimationFrame (before next paint)
  Idle, // Use requestIdleCallback (when browser is idle)
}

/**
 * Configuration for the scheduler
 * @internal
 */
export interface SchedulerConfig {
  defaultMode: SchedulerMode;
  batchedUpdates: boolean; // Whether to automatically batch updates
}
