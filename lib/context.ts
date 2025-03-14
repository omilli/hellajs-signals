import type {
  Signal,
  EffectFn,
  SignalOptions,
  EffectOptions,
  ComputedFn,
  SignalValue,
  CleanupFunction,
  ReactiveContext,
  ReactiveState,
} from "./types";

// Create a symbol for storing the default context
const DEFAULT_CONTEXT_KEY = Symbol.for("reactiveContext");
const NOT_TRACKING = Symbol.for("not-tracking");

// Track the current context
let currentContext: ReactiveContext | null = null;
const contextStates = new WeakMap<ReactiveContext, ReactiveState>();

/**
 * Get the currently active context, or default if none is set
 */
export function getCurrentContext(): ReactiveState {
  const ctx = currentContext || getDefaultContext();
  return contextStates.get(ctx)!;
}

/**
 * Set the currently active context
 */
export function setCurrentContext(ctx: ReactiveContext | null): void {
  currentContext = ctx;
}

/**
 * Run a function with a specific context
 */
export function withContext<T>(ctx: ReactiveContext, fn: () => T): T {
  const prevContext = currentContext;
  currentContext = ctx;
  try {
    return fn();
  } finally {
    currentContext = prevContext;
  }
}

/**
 * Creates an isolated reactive context
 */
export function createContext(): ReactiveContext {
  // Create initial reactive state for this context
  const reactiveState: ReactiveState = {
    id: Math.random().toString(36).slice(2),
    activeTracker: NOT_TRACKING,
    pendingNotifications: [],
    pendingRegistry: new Set<EffectFn>(),
    executionContext: [],
    effectDependencies: new Map(),
    effects: new Set<CleanupFunction>(),
    signals: new WeakSet(),
    batchDepth: 0, // Initialize batchDepth to 0
  };

  // Create context-specific versions of API functions
  const context: ReactiveContext = {
    signal: <T>(initialValue: T, options?: SignalOptions<T>): Signal<T> => {
      return withContext(context, () => {
        // Lazy-load to avoid circular dependencies
        const { signal } = require("./signal");
        const s = signal(initialValue, options);
        reactiveState.signals.add(s);
        return s;
      });
    },

    effect: (fn: EffectFn, options?: EffectOptions): CleanupFunction => {
      return withContext(context, () => {
        // Lazy-load to avoid circular dependencies
        const { effect } = require("./effect");
        const cleanup = effect(fn, options);

        // Track the effect for potential context disposal
        reactiveState.effects.add(cleanup);

        // Wrap the cleanup function to remove from tracked effects when called
        const originalCleanup = cleanup;
        const wrappedCleanup = () => {
          reactiveState.effects.delete(originalCleanup);
          return originalCleanup();
        };

        // Copy properties from original cleanup
        Object.getOwnPropertyNames(originalCleanup).forEach((prop) => {
          if (prop !== "name" && prop !== "length") {
            Object.defineProperty(
              wrappedCleanup,
              prop,
              Object.getOwnPropertyDescriptor(originalCleanup, prop)!
            );
          }
        });

        return wrappedCleanup;
      });
    },

    computed: <T>(deriveFn: ComputedFn<T>): SignalValue<T> => {
      return withContext(context, () => {
        // Lazy-load to avoid circular dependencies
        const { computed } = require("./computed");
        return computed(deriveFn);
      });
    },

    batch: <T>(fn: () => T): T => {
      return withContext(context, () => {
        // Lazy-load to avoid circular dependencies
        const { batch } = require("./batch");
        return batch(fn);
      });
    },

    untracked: <T>(fn: () => T): T => {
      return withContext(context, () => {
        // Lazy-load to avoid circular dependencies
        const { untracked } = require("./untracked");
        return untracked(fn);
      });
    },
  };

  // Store the reactive state for this context
  contextStates.set(context, reactiveState);

  return context;
}

/**
 * Gets or creates the default reactive context for the environment
 */
export function getDefaultContext(): ReactiveContext {
  const globalObj = getGlobalThis();

  // Create default context if it doesn't exist
  if (!globalObj[DEFAULT_CONTEXT_KEY]) {
    globalObj[DEFAULT_CONTEXT_KEY] = createContext();
  }

  return globalObj[DEFAULT_CONTEXT_KEY];
}

// Detect the global object across different environments
function getGlobalThis(): any {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  if (typeof self !== "undefined") return self;
  return Function("return this")();
}
