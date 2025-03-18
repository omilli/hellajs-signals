import type {
	ComputedFn,
	ComputedOptions,
	ContextState,
	EffectFn,
	EffectOptions,
	ReactiveContext,
	Signal,
	SignalOptions,
	SignalValue,
} from "../types";
import { createReactiveState } from "../utils/state";
import { registerContextState, withContext } from "./utils";

/**
 * Creates an isolated reactive context
 *
 * A reactive context provides a complete set of reactive primitives
 * (signals, effects, computed values) that operate independently from
 * other contexts. This allows for isolated reactivity systems that
 * don't interfere with each other.
 *
 * @returns A reactive context object with API methods
 */
export function createReactiveContext(
	dependencies: ReactiveContext,
): ReactiveContext {
	const id = `ctx_${Math.random().toString(36).slice(2, 10)}`;
	const state = createReactiveState(id);
	const context = createContext(dependencies, state);
	registerContextState(context, state);
	return context;
}

function createContext(dependencies: ReactiveContext, state: ContextState) {
	/**
	 * Creates a reactive context for managing signals and effects.
	 *
	 * This context provides methods for creating reactive signals, effects,
	 * computed values, batch updates, and untracked computations. It also
	 * includes a dispose method for cleaning up resources associated with the
	 * context.
	 */
	const context: ReactiveContext = {
		signal: <T>(initialValue: T, options?: SignalOptions<T>): Signal<T> => {
			return withContext(context, () => {
				const s = dependencies.signal(initialValue, options);
				state.signals.add(s);
				return s;
			});
		},

		effect: (fn: EffectFn, options?: EffectOptions): EffectFn => {
			return withContext(context, () => {
				const cleanup = dependencies.effect(fn, options) as EffectFn;
				const wrappedCleanup = () => {
					state.effects.delete(cleanup);
					return cleanup();
				};

				state.effects.add(cleanup);

				for (const prop of Object.getOwnPropertyNames(cleanup)) {
					if (prop !== "name" && prop !== "length") {
						Object.defineProperty(
							wrappedCleanup,
							prop,
							Object.getOwnPropertyDescriptor(
								cleanup,
								prop,
							) as PropertyDescriptor,
						);
					}
				}

				if (cleanup._effect) {
					Object.defineProperty(wrappedCleanup, "_effect", {
						value: cleanup._effect,
					});
				}

				return wrappedCleanup;
			});
		},

		computed: <T>(
			deriveFn: ComputedFn<T>,
			options?: ComputedOptions<T>,
		): SignalValue<T> => {
			return withContext(context, () => {
				return dependencies.computed(deriveFn, options);
			});
		},

		batch: <T>(fn: () => T): T => {
			return withContext(context, () => {
				return dependencies.batch(fn);
			});
		},

		untracked: <T>(fn: () => T): T => {
			return withContext(context, () => {
				return dependencies.untracked(fn);
			});
		},

		dispose: () => {
			for (const cleanup of state.effects) {
				cleanup();
			}
			state.signals = new WeakSet();
			state.effectDependencies.clear();
		},
	};

	return context;
}
