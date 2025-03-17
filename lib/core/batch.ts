import { flushEffects } from "./effect";
import { getCurrentContext } from "../context";

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
      flushEffects();
    }
  }
}
