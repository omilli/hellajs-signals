import type { EffectFn } from "./effect.types";

/**
 * Represents the base interface for a reactive signal.
 * It provides a function to access the signal's value and a set of dependencies.
 */
export interface SignalBase {
	/**
	 * Function to access the signal's value.
	 * @returns The signal's value.
	 */
	(): unknown;
	/**
	 * A set of weak references to the effects that depend on this signal.
	 * Used for dependency tracking and automatic updates.
	 */
	_deps: Set<WeakRef<EffectFn>>;
}

/**
 * Represents a computed signal's value.
 * Extends `SignalBase` and includes a cleanup method and a flag indicating if it's a computed value.
 */
export interface SignalValue<T> {
	/**
	 * Function to access the computed signal's value.
	 * @returns The computed signal's value.
	 */
	(): T;
	/**
	 * Method to clean up resources associated with the computed signal.
	 * This is important to prevent memory leaks.
	 */
	_cleanup: () => void;
	/**
	 * Flag indicating if this is a computed signal.
	 * Used for internal checks and optimizations.
	 */
	_isComputed: boolean;
}

/**
 * Represents a reactive signal that holds a value of type `T`.
 * It provides methods to get, set, and update the value, as well as track dependencies.
 */
export interface Signal<T> {
	/**
	 * Function to access the signal's value.
	 * @returns The signal's value.
	 */
	(): T;
	/**
	 * Method to set the signal's value.
	 * @param value The new value for the signal.
	 */
	set: (value: T) => void;
	/**
	 * Method to update the signal's value based on its current value.
	 * @param updater A function that takes the current value and returns the new value.
	 */
	update: (updater: (value: T) => T) => void;
	/**
	 * A set of weak references to the effects that depend on this signal.
	 * Used for dependency tracking and automatic updates.
	 */
	_deps: Set<WeakRef<EffectFn>>;
}

/**
 * Represents the options for creating a signal.
 */
export interface SignalOptions<T> {
	/**
	 * An optional name for the signal, useful for debugging.
	 */
	name?: string;
	/**
	 * An optional array of validator functions that are called before setting the signal's value.
	 * If any validator returns `false`, the value is not updated.
	 */
	validators?: Array<(value: T) => T | undefined>;
	/**
	 * An optional callback function that is called after the signal's value changes.
	 * @param newValue The new value of the signal.
	 * @param oldValue The previous value of the signal.
	 */
	onSet?: (newValue: unknown, oldValue: unknown) => void;
}
