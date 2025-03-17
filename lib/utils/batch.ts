import type { ReactiveState } from "../types";

/**
 * Starts a batch operation
 */
export function startBatch(state: ReactiveState): void {
  state.batchDepth++;
}

/**
 * Ends a batch operation
 */
export function endBatch(state: ReactiveState): boolean {
  if (state.batchDepth > 0) {
    state.batchDepth--;
    return state.batchDepth === 0;
  }
  return false;
}

/**
 * Get the current batch depth
 */
export function getBatchDepth(state: ReactiveState): number {
  return state.batchDepth;
}
