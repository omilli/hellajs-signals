import { withState, createReactiveState } from "../utils";
import type { ReactiveContext, ReactiveState } from "../types";
import { createDefaultContext } from "./bridge";

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
    let state = contextStates.get(ctx);
    if (!state) {
      state = createReactiveState(`context-${ctx}`); // Create state if it doesn't exist
      contextStates.set(ctx, state); // Register the new state
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
    // Use bridge to create context, avoiding circular import
    const context = createDefaultContext();
    globalObj[DEFAULT_CONTEXT_KEY] = context;
    registerContextState(context, createReactiveState("default-context")); // Register state for default context
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
 * Helper to detect the global object across environments
 */
function getGlobalThis(): any {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  if (typeof self !== "undefined") return self;
  return Function("return this")();
}
