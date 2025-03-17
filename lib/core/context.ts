import { signal } from "./signal";
import { effect } from "./effect";
import { computed } from "./computed";
import { batch } from "./batch";
import { untracked } from "./untracked";
import { registerContextFactory } from "../context";
import type { ReactiveContext } from "../types";

// Import factory directly to avoid going through index
import { createReactiveContext } from "../context/factory";

/**
 * Creates an isolated reactive context with its own state and reactivity
 */
export function createContext(): ReactiveContext {
  // Create context with all dependencies injected
  return createReactiveContext({
    signal,
    effect,
    computed,
    batch,
    untracked,
  });
}

// Register the context factory with the bridge
registerContextFactory(() => createContext());
