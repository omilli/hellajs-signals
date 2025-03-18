import { getCurrentContext } from "../context";
import { flushEffects } from "../utils";
/**
 * Batch multiple signal updates together
 * Effects will only run once at the end of the batch
 */
export function batch<T>(fn: () => T): T {
	const ctx = getCurrentContext();

	// Increment batch depth
	ctx.batchDepth = (ctx.batchDepth || 0) + 1;

	try {
		return fn();
	} finally {
		// Decrement batch depth
		ctx.batchDepth = ctx.batchDepth - 1;

		// If we're back at the top level, flush any pending effects
		if (ctx.batchDepth === 0) {
			if (
				typeof window !== "undefined" &&
				typeof queueMicrotask === "function"
			) {
				queueMicrotask(() => flushEffects(ctx));
			} else {
				flushEffects(ctx);
			}
		}
	}
}
