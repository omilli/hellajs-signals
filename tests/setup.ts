import { mock, spyOn } from "bun:test";
import { signal, effect, getCurrentContext } from "../lib";

export const ctx = getCurrentContext();

// Common test case categories
export const testCategories = {
  basic: "basic functionality",
  advanced: "advanced features",
  memory: "memory management",
  errors: "error handling",
  options: "configuration options",
};

export const warnSpy = () =>
  spyOn(console, "warn").mockImplementation(() => {});
export const errorSpy = () =>
  spyOn(console, "error").mockImplementation(() => {});

// Helper to silence console warnings/errors during tests
export function silenceConsole(fn: () => void): void {
  try {
    fn();
  } finally {
    errorSpy().mockRestore();
    warnSpy().mockRestore();
  }
}

// Helper for memory and cleanup tests
export function createManyEffectsAndDispose(
  count: number,
  createFn = signal,
  effectFn = effect
) {
  const initialMapSize = ctx.effectDependencies.size;

  for (let i = 0; i < count; i++) {
    const s = createFn(i);
    const dispose = effectFn(() => {
      s();
    });
    dispose();
  }

  return initialMapSize;
}
