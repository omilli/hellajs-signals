import { getCurrentContext } from "../context";
import { flushEffects } from "../utils";

/**
 * Batches a series of operations together, preventing intermediate effects from being flushed until the batch is complete.
 *
 * This function is used to group multiple state updates or other operations into a single batch,
 * which can improve performance by reducing the number of times the UI needs to be updated or other side effects need to be executed.
 *
 * @param fn A function that contains the operations to be batched.
 * @returns The result of the function.
 *
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
