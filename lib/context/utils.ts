import { batch } from "../core/batch";
import { computed } from "../core/computed";
import { effect } from "../core/effect";
import { signal } from "../core/signal";
import { untracked } from "../core/untracked";
import type { ContextState, ReactiveContext } from "../types";
import { createReactiveState } from "../utils";
import { createContextAPI } from "./api";

// Track context states using WeakMap for proper garbage collection
const contextStates = new WeakMap<ReactiveContext, ContextState>();

// Track the current context
const currentContext: ReactiveContext | null = null;

// Symbol for storing default context in global scope
const DEFAULT_CONTEXT_KEY = Symbol.for("reactiveContext");

/**
 * Creates a new reactive context with a unique identifier and associated state.
 *
 * @param dependencies - The dependencies required for the reactive context
 * @returns A new reactive context instance with initialized state and context API
 */
export function createReactiveContext(
	dependencies: ReactiveContext,
): ReactiveContext {
	const id = `ctx_${Math.random().toString(36).slice(2, 10)}`;
	const state = createReactiveState(id);
	const context = createContextAPI(dependencies, state);
	registerContextState(context, state);
	return context;
}

/**
 * Retrieves the current context state from the global context.
 * If no current context exists, falls back to the default context.
 *
 * @returns The active context state
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
 * Retrieves the default reactive context.
 * Uses the globalThis object to store and retrieve a default ReactiveContext.
 *
 * @returns The default ReactiveContext.
 */
export function getDefaultContext(): ReactiveContext {
	const globalObj = getGlobalThis() as unknown as {
		[DEFAULT_CONTEXT_KEY]: ReactiveContext;
	};

	// Create default context if it doesn't exist
	if (!globalObj[DEFAULT_CONTEXT_KEY]) {
		// Use bridge to create context, avoiding circular import
		const context = createReactiveContext({
			signal,
			effect,
			computed,
			batch,
			untracked,
		});
		globalObj[DEFAULT_CONTEXT_KEY] = context;
		registerContextState(context, createReactiveState("default-context")); // Register state for default context
	}

	return globalObj[DEFAULT_CONTEXT_KEY];
}

/**
 * Registers a context state with a reactive context.
 *
 * @param context - The reactive context to associate the state with.
 * @param state - The context state to register.
 */
export function registerContextState(
	context: ReactiveContext,
	state: ContextState,
): void {
	contextStates.set(context, state);
}

/**
 * Attempts to return the global `this` object in a way that works across different JavaScript environments,
 * including browsers, Node.js, and web workers.
 *
 * @returns The global `this` object. This could be `globalThis`, `window`, `global`, `self`, or the result of `Function("return this")()`.
 */
function getGlobalThis(): Window | typeof globalThis {
	if (typeof globalThis !== "undefined") return globalThis;
	if (typeof window !== "undefined") return window;
	if (typeof global !== "undefined") return global;
	if (typeof self !== "undefined") return self;
	return Function("return this")();
}
