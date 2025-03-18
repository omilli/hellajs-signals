/**
 * Represents a function that derives a computed value from other signals or state.
 */
export type ComputedFn<T> = () => T;

/**
 * Represents the options for creating a computed value.
 */
export interface ComputedOptions<T> {
	/**
	 * An optional name for the computed value, useful for debugging.
	 */
	name?: string;
	/**
	 * Indicates whether the computed value should be kept alive even when it has no subscribers.
	 * This can improve performance in some cases, but can also increase memory usage.
	 */
	keepAlive?: boolean;
	/**
	 * An optional error handler function that is called if the computed function throws an error.
	 * @param error The error that was thrown.
	 */
	onError?: (error: Error) => void;
	/**
	 * An optional callback function that is called after the computed value is updated.
	 * @param value The new value of the computed value.
	 */
	onComputed?: (value: T) => void;
}
