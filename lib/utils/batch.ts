import type { ContextState } from "../types";

/**
 * Starts a batch operation
 */
export function startBatch(state: ContextState): void {
	state.batchDepth++;
}

/**
 * Ends a batch operation
 */
export function endBatch(state: ContextState): boolean {
	if (state.batchDepth > 0) {
		state.batchDepth--;
		return state.batchDepth === 0;
	}
	return false;
}
