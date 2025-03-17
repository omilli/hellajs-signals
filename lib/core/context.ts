import { signal } from "./signal";
import { effect } from "./effect";
import { computed } from "./computed";
import { batch } from "./batch";
import { untracked } from "./untracked";
import { createReactiveState } from "../reactive/state";
import { createReactiveContext, registerContextState } from "../context";

/**
 * Creates an isolated reactive context with its own state and reactivity
 *
 * @returns A reactive context object with API methods
 */
export function createContext(): ReturnType<typeof createReactiveContext> {
  // Create a unique ID for this context
  const id = `ctx_${Math.random().toString(36).slice(2, 10)}`;

  // Create reactive state for this context
  const state = createReactiveState(id);

  // Create context with all dependencies injected
  const context = createReactiveContext({
    signal,
    effect,
    computed,
    batch,
    untracked,
  });

  // Register state for this context
  registerContextState(context, state);

  return context;
}
