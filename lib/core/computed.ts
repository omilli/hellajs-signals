import type { ComputedFn, ComputedOptions, SignalValue } from "../types";
import { effect } from "./effect";
import { signal } from "./signal";
import { untracked } from "./untracked";

/**
 * Creates a computed signal that derives its value from other reactive dependencies.
 * The computed value is lazily evaluated and cached until its dependencies change.
 *
 * @template T - The type of the computed value
 * @param computedFn - Function that computes the derived value
 * @param options - Optional configuration options
 *
 * @returns A signal-like accessor function that returns the current computed value
 *
 */
export function computed<T>(
	computedFn: ComputedFn<T>,
	options?: ComputedOptions<T>,
): SignalValue<T> {
	// Extract options with defaults
	const { name, onError, onComputed, keepAlive = false } = options || {};
	// Create a backing signal to store the computed value
	const backingSignal = signal<T>(undefined as unknown as T, { name });

	// Internal state management
	let value: T; // Cached value
	let isStale = true; // Indicates if the cached value needs to be recomputed
	let isDisposed = false; // Indicates if this computed signal has been cleaned up

	/**
	 * Standardized error handling for compute operations
	 * Returns the error if there's no error handler (to be thrown)
	 */
	const handleError = (error: unknown) => {
		if (onError && error instanceof Error) {
			onError(error);
		} else {
			console.error("Error in computed:", name || "unnamed", error);
		}
		return !onError ? error : undefined;
	};

	/**
	 * Computes the value and updates the internal state
	 * Triggers the onComputed callback if provided
	 */
	const computeAndUpdate = () => {
		const newValue = computedFn();
		backingSignal.set(newValue);
		value = newValue;
		isStale = false;

		if (onComputed) {
			// Run callback outside of tracking context to avoid circular dependencies
			untracked(() => onComputed(value));
		}

		return newValue;
	};

	/**
	 * Safely attempts to compute the value
	 * @param withUpdate - Whether to update the internal state with the computed value
	 * @returns The computed value or undefined if an error occurred
	 */
	const tryCompute = (withUpdate = true) => {
		try {
			return withUpdate ? computeAndUpdate() : computedFn();
		} catch (error) {
			const maybeThrow = handleError(error);
			if (maybeThrow) throw maybeThrow;
		}
	};

	/**
	 * Set up a reactive effect that tracks dependencies of the computed function
	 * This makes the computed value automatically update when dependencies change
	 */
	const cleanup = effect(
		() => {
			if (isDisposed) return;
			// Mark as stale whenever dependencies change
			isStale = true;

			if (keepAlive) {
				// For keepAlive mode, immediately compute and update the value
				tryCompute(true);
			} else {
				// Otherwise, just run the function to capture dependencies without updating
				tryCompute(false);
			}
		},
		{ name: `${name || "computed"}_tracker` },
	);

	/**
	 * The accessor function that returns the computed value
	 * Lazily computes the value when accessed if it's stale
	 */
	const accessor = () => {
		if (isStale && !isDisposed) {
			tryCompute(true);
		}

		return backingSignal();
	};

	// Add metadata and cleanup method to the accessor function
	Object.defineProperties(accessor, {
		_isComputed: { value: true },
		_name: { value: name },
		_cleanup: {
			value: () => {
				isDisposed = true;
				cleanup();
			},
		},
	});

	return accessor as SignalValue<T>;
}
