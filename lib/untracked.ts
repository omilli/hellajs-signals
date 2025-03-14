import { getCurrentContext, NOT_TRACKING } from "./context";

/**
 * Access a signal's value without creating a dependency
 */
export function untracked<T>(fn: () => T): T {
  const ctx = getCurrentContext();
  const prevEffect = ctx.activeTracker;

  // Mark as not tracking during execution
  ctx.activeTracker = NOT_TRACKING;

  try {
    return fn();
  } finally {
    // Make sure we restore the previous state
    ctx.activeTracker = prevEffect;
  }
}
