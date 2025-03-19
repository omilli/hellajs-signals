import type { ContextState, ReactiveContext } from "../types";
import { createReactiveState } from "../utils";
import { createDefaultContext } from "./bridge";

// Track context states using WeakMap for proper garbage collection
const contextStates = new WeakMap<ReactiveContext, ContextState>();

// Track the current context
let currentContext: ReactiveContext | null = null;

// Symbol for storing default context in global scope
const DEFAULT_CONTEXT_KEY = Symbol.for("reactiveContext");

/**
 * Get the currently active context's state
 */
export function getCurrentContext(): ContextState {
  const ctx = currentContext || getDefaultContext();
  const state = contextStates.get(ctx);
  if (!state) {
    throw new Error("No active reactive state available");
  }
  return state;
}
/**
 * Gets the default context, creating it if needed
 */
export function getDefaultContext(): ReactiveContext {
  const globalObj = getGlobalThis() as unknown as {
    [DEFAULT_CONTEXT_KEY]: ReactiveContext;
  };

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
  state: ContextState
): void {
  contextStates.set(context, state);
}

/**
 * Helper to detect the global object across environments
 */
function getGlobalThis(): Window | typeof globalThis {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  if (typeof self !== "undefined") return self;
  return Function("return this")();
}
