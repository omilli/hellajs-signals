/**
 * Represents a function that is executed when its dependencies change.
 */
export interface EffectFn {
	/**
	 * Executes the effect.
	 */
	(): void;
	/**
	 * Indicates whether the effect has run at least once.
	 */
	_hasRun?: boolean;
	/**
	 * An optional name for the effect, useful for debugging.
	 */
	_name?: string;
	/**
	 * An optional priority for the effect, used to determine the order in which effects are executed.
	 */
	_priority?: number;
	/**
	 * Indicates whether the effect has been disposed of.
	 */
	_disposed?: boolean;
	/**
	 * A reference to the original effect function, used for internal tracking.
	 */
	_effect?: EffectFn;
}
/**
 * Represents the options for creating an effect.
 */
export interface EffectOptions {
	/**
	 * An optional name for the effect, useful for debugging.
	 */
	name?: string;
	/**
	 * An optional scheduler function that is called to run the effect.
	 * This can be used to control when and how the effect is executed.
	 * @param run A function that executes the effect.
	 */
	scheduler?: (run: () => void) => void;
	/**
	 * An optional priority for the effect, used to determine the order in which effects are executed.
	 */
	priority?: number;
	/**
	 * Indicates whether the effect should only run once.
	 */
	once?: boolean;
	/**
	 * An optional debounce time in milliseconds.
	 * If provided, the effect will only run after the specified time has elapsed since the last dependency change.
	 */
	debounce?: number;
	/**
	 * @deprecated
	 * Indicates whether the effect should run immediately.
	 */
	immediate?: boolean;
	/**
	 * An optional error handler function that is called if the effect throws an error.
	 * @param error The error that was thrown.
	 */
	onError?: (error: Error) => void;
	/**
	 * An optional cleanup function that is called when the effect is disposed of.
	 * This can be used to release resources or unsubscribe from events.
	 */
	onCleanup?: () => void;
}
