import { flushEffects } from "./effect";

// Batch update mechanism
let batchDepth: number = 0;

export const getBatchDepth = (): number => batchDepth;

/**
 * Batch multiple signal updates together
 * Effects will only run once at the end of the batch
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushEffects();
    }
  }
}
