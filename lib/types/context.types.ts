import type { ComputedFn, ComputedOptions } from "./computed.types";
import type { EffectFn, EffectOptions } from "./effect.types";
import type { Signal, SignalOptions, SignalValue } from "./signal.types";

/**
 * Represents a reactive context that provides a set of reactive primitives.
 * This allows for creating isolated reactivity systems that don't interfere with each other.
 */
export interface ReactiveContext {
	/**
	 * Creates a reactive signal with the specified initial value.
	 * @param initialValue The initial value of the signal.
	 * @param options The options for creating the signal.
	 * @returns A reactive signal.
	 */
	signal: <T>(initialValue: T, options?: SignalOptions<T>) => Signal<T>;
	/**
	 * Creates an effect that runs when its dependencies change.
	 * @param fn The function to execute.
	 * @param options The options for creating the effect.
	 * @returns A function to dispose of the effect.
	 */
	effect: (fn: EffectFn, options?: EffectOptions) => EffectFn;
	/**
	 * Creates a computed value that automatically updates when its dependencies change.
	 * @param computedFn A function that derives the computed value from other signals or state.
	 * @param options The options for creating the computed value.
	 * @returns A signal value.
	 */
	computed: <T>(
		computedFn: ComputedFn<T>,
		options?: ComputedOptions<T>,
	) => SignalValue<T>;
	/**
	 * Batches multiple signal updates together.
	 * Effects will only run once at the end of the batch.
	 * @param fn A function that performs the signal updates.
	 * @returns The return value of the function.
	 */
	batch: <T>(fn: () => T) => T;
	/**
	 * Accesses a signal's value without creating a dependency.
	 * @param fn A function that accesses the signal's value.
	 * @returns The return value of the function.
	 */
	untracked: <T>(fn: () => T) => T;
	/**
	 * Disposes of the reactive context and all its resources.
	 */
	dispose?(): void;
}

/**
 * @internal
 * Represents the internal state of a reactive context.
 */
export interface ContextState {
	/**
	 * A unique identifier for the reactive state.
	 */
	id: string;
	/**
	 * The currently active effect tracker.
	 */
	activeTracker: EffectFn | symbol;
	/**
	 * A list of effects that are pending execution.
	 */
	pendingNotifications: EffectFn[];
	/**
	 * A set of effects that are pending execution, used for deduplication.
	 */
	pendingRegistry: Set<EffectFn>;
	/**
	 * A stack of effects that are currently being executed.
	 */
	executionContext: EffectFn[];
	/**
	 * A map of effects to their dependencies.
	 */
	effectDependencies: Map<EffectFn, Set<unknown>>;
	/**
	 * A set of all effects in this context.
	 */
	effects: Set<EffectFn>;
	/**
	 * A weak set of all signals in this context.
	 */
	signals: WeakSet<WeakKey>;
	/**
	 * The current batch depth.
	 */
	batchDepth: number;
	/**
	 * Currently executing parent effect
	 */
	currentExecutingEffect: EffectFn | null;
	/**
	 * Map of parent effects to their child effects
	 */
	parentChildEffectsMap: WeakMap<EffectFn, Set<EffectFn>>;
}
