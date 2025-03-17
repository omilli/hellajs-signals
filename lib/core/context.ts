import { signal } from "./signal";
import { effect } from "./effect";
import { computed } from "./computed";
import { batch } from "./batch";
import { untracked } from "./untracked";
import { createReactiveContext } from "../context";

/**
 * Creates an isolated reactive context with its own state and reactivity
 *
 * @returns A reactive context object with API methods
 */
export function createContext(): ReturnType<typeof createReactiveContext> {
  // Create context with all dependencies injected
  const context = createReactiveContext({
    signal,
    effect,
    computed,
    batch,
    untracked,
  });

  return context;
}
