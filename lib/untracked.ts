import { executeUntracked } from "./context";

/**
 * Access a signal's value without creating a dependency
 */
export function untracked<T>(fn: () => T): T {
  return executeUntracked(fn);
}
