import {
  signal as createSignal,
  effect as createEffect,
  computed as createComputed,
} from "./index";
import type {
  Signal,
  EffectFn,
  SignalOptions,
  EffectOptions,
  ComputedFn,
  SignalValue,
  CleanupFunction,
  ReactiveContext,
} from "./types";

// Create a symbol for storing the default context
const DEFAULT_CONTEXT_KEY = Symbol.for("@hellajs/reactive/context");

/**
 * Creates an isolated reactive context
 */
export function createContext(): ReactiveContext {
  // Store context-specific state
  const contextState = {
    id: Math.random().toString(36).slice(2),
    effects: new Set<CleanupFunction>(),
    signals: new WeakSet(),
  };

  // Create context-specific versions of API functions
  const context: ReactiveContext = {
    signal: <T>(initialValue: T, options?: SignalOptions<T>): Signal<T> => {
      const s = createSignal(initialValue, options);
      contextState.signals.add(s);
      return s;
    },

    effect: (fn: EffectFn, options?: EffectOptions): CleanupFunction => {
      const cleanup = createEffect(fn, options);

      // Track the effect for potential context disposal
      contextState.effects.add(cleanup);

      // Wrap the cleanup function to remove from tracked effects
      return () => {
        contextState.effects.delete(cleanup);
        return cleanup();
      };
    },

    computed: <T>(deriveFn: ComputedFn<T>): SignalValue<T> => {
      return createComputed(deriveFn);
    },

    batch: <T>(fn: () => T): T => {
      const { batch } = require("./batch");
      return batch(fn);
    },

    untracked: <T>(fn: () => T): T => {
      const { untracked } = require("./untracked");
      return untracked(fn);
    },
  };

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
