import { createReactiveState, withState } from "../reactive/state";
import type { ReactiveContext, ReactiveState } from "../types";
import { signal } from "../core/signal";
import { effect } from "../core/effect";
import { computed } from "../core/computed";
import { batch } from "../core/batch";
import { untracked } from "../core/untracked";
import { createReactiveContext } from "./factory";

// Track context states using WeakMap for proper garbage collection
const contextStates = new WeakMap<ReactiveContext, ReactiveState>();

// Track the current context
let currentContext: ReactiveContext | null = null;

// Symbol for storing default context in global scope
const DEFAULT_CONTEXT_KEY = Symbol.for("reactiveContext");

/**
 * Get the currently active context's state
 */
export function getCurrentContext(): ReactiveState {
  const ctx = currentContext || getDefaultContext();
  const state = contextStates.get(ctx);
  if (!state) {
    throw new Error("No active reactive state available");
  }
  return state;
}

/**
 * Set the currently active context
 */
export function setCurrentContext(ctx: ReactiveContext | null): void {
  currentContext = ctx;
}

/**
 * Run a function with a specific context as active
 */
export function withContext<T>(ctx: ReactiveContext, fn: () => T): T {
  const prevContext = currentContext;
  currentContext = ctx;

  try {
    // Get the context's reactive state
    const state = contextStates.get(ctx);
    if (!state) {
      throw new Error("Context has no associated reactive state");
    }

    // Run with this context's state as active
    return withState(state, fn);
  } finally {
    currentContext = prevContext;
  }
}

/**
 * Gets the default context, creating it if needed
 */
export function getDefaultContext(): ReactiveContext {
  const globalObj = getGlobalThis();

  // Create default context if it doesn't exist
  if (!globalObj[DEFAULT_CONTEXT_KEY]) {
    // Inject dependencies when creating the context
    const context = createContextInstance("default");
    globalObj[DEFAULT_CONTEXT_KEY] = context;
  }

  return globalObj[DEFAULT_CONTEXT_KEY];
}

/**
 * Register a reactive state for a context
 */
export function registerContextState(
  context: ReactiveContext,
  state: ReactiveState
): void {
  contextStates.set(context, state);
}

/**
 * Creates a context instance with internal state
 */
function createContextInstance(id: string): ReactiveContext {
  // Create placeholder for context methods
  const context = {} as ReactiveContext;

  // Create reactive state for this context
  const state = createReactiveState(id);

  // Register the state for this context
  registerContextState(context, state);

  return createReactiveContext({
    signal,
    effect,
    computed,
    batch,
    untracked,
  });
}

/**
 * Helper to detect the global object across environments
 */
function getGlobalThis(): any {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  if (typeof self !== "undefined") return self;
  return Function("return this")();
}
