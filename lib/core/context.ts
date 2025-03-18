import { registerContextFactory } from "../context";
import type { ReactiveContext } from "../types";
import { batch } from "./batch";
import { computed } from "./computed";
import { effect } from "./effect";
import { signal } from "./signal";
import { untracked } from "./untracked";

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
