import { flushEffects } from "./effect";
import { getCurrentContext } from "./context";

// Batch update mechanism
const batchStates = new Map<string, number>();

export const getBatchDepth = (): number => {
  const ctx = getCurrentContext();
  const contextId = ctx.id;
  return batchStates.get(contextId) || 0;
};

/**
 * Batch multiple signal updates together
 * Effects will only run once at the end of the batch
 */
export function batch<T>(fn: () => T): T {
  const ctx = getCurrentContext();
  const contextId = ctx.id;
  const currentDepth = batchStates.get(contextId) || 0;
  batchStates.set(contextId, currentDepth + 1);

  try {
    return fn();
  } finally {
    const newDepth = (batchStates.get(contextId) || 0) - 1;
    batchStates.set(contextId, newDepth);

    if (newDepth === 0) {
      flushEffects();
    }
  }
}
