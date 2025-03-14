import { getCurrentEffect, setCurrentEffect } from "./effect";

/**
 * Access a signal's value without creating a dependency
 */
export function untracked<T>(fn: () => T): T {
  const prevEffect = getCurrentEffect();
  setCurrentEffect(null);
  try {
    return fn();
  } finally {
    setCurrentEffect(prevEffect);
  }
}
