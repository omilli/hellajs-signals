import { createReactiveContext } from "../context";
import type { ReactiveContext } from "../types";
import { batch } from "./batch";
import { computed } from "./computed";
import { effect } from "./effect";
import { signal } from "./signal";
import { untracked } from "./untracked";

/**
 * Creates a reactive context with injected dependencies.
 *
 * @returns A new reactive context.
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
