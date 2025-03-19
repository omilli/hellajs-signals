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

/**
 * Creates a context API with reactive capabilities.
 *
 * @param dependencies - The reactive context dependencies that provide core functionality
 * @param state - The current context state for tracking signals and effects
 * @returns An object containing reactive programming utilities.
 */
export function createContextAPI(
	dependencies: ReactiveContext,
	state: ContextState,
) {
	return {
		/**
		 * Creates a new signal with the given initial value and options.
		 *
		 * @param initialValue The initial value of the signal.
		 * @param options Optional signal options.
		 * @returns A new signal.
		 */
		signal<T>(initialValue: T, options?: SignalOptions<T>): Signal<T> {
			const s = dependencies.signal(initialValue, options);
			state.signals.add(s);
			return s;
		},
		/**
		 * Creates a new effect with the given function and options.
		 * The effect is automatically cleaned up when the context is disposed.
		 *
		 * @param fn The function to execute as the effect.
		 * @param options Optional options for the effect.
		 * @returns A wrapped cleanup function that removes the effect from the context and executes the original cleanup function.
		 */
		effect(fn: EffectFn, options?: EffectOptions): EffectFn {
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
		},
		/**
		 * Creates a computed signal whose value is derived from other signals.
		 *
		 * @param computedFn A function that computes the value of the signal. It can read other signals, and it will be re-executed whenever any of its dependencies change.
		 * @param options Optional configuration for the computed signal, such as specifying an equality function to prevent unnecessary updates.
		 * @returns A `SignalValue` representing the computed value.
		 */
		computed<T>(
			computedFn: ComputedFn<T>,
			options?: ComputedOptions<T>,
		): SignalValue<T> {
			return dependencies.computed(computedFn, options);
		},
		/**
		 * Batches a series of operations together.
		 *
		 * This is useful for grouping multiple operations into a single unit of work,
		 * which can improve performance and reduce the number of network requests.
		 *
		 * @param fn The function to execute within the batch.
		 * @returns The result of the function.
		 */
		batch<T>(fn: () => T): T {
			return dependencies.batch(fn);
		},
		/**
		 * Executes the provided function without tracking its dependencies.
		 *
		 * This is useful for preventing certain operations within the function from triggering reactivity.
		 *
		 * @template T The return type of the provided function.
		 * @param {() => T} fn The function to execute without tracking dependencies.
		 * @returns The result of the provided function.
		 */
		untracked<T>(fn: () => T): T {
			return dependencies.untracked(fn);
		},
	};
}
