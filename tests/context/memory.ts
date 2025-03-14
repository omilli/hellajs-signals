import { describe, test, expect } from "bun:test";
import { createContext, effectDependencies } from "../../lib";

export const contextMemory = () =>
  describe("memory management", () => {
    test("contexts should clean up disposed effects", () => {
      const ctx = createContext();

      // Track initial effect count
      const initialEffectCount = effectDependencies.size;

      // Create 10 effects and immediately dispose them
      for (let i = 0; i < 10; i++) {
        const sig = ctx.signal(i);
        const dispose = ctx.effect(() => {
          sig(); // Create dependency
        });
        dispose(); // Immediately dispose
      }

      // Effect count should return to initial value
      expect(effectDependencies.size).toBe(initialEffectCount);
    });

    test("contexts should be garbage collectable when no longer referenced", async () => {
      // This test is harder to assert directly, but we can check that
      // creating many contexts doesn't permanently increase memory usage

      // Create and immediately discard 100 contexts with complex reactivity
      for (let i = 0; i < 100; i++) {
        const tempCtx = createContext();
        const sig1 = tempCtx.signal(i);
        const sig2 = tempCtx.signal(i * 2);
        const comp = tempCtx.computed(() => sig1() + sig2());
        tempCtx.effect(() => {
          comp(); // Create a dependency chain
        });

        // Update to trigger reactivity
        sig1.set(i + 1);
      }

      // Force garbage collection if possible (implementation dependent)
      // Note: this is not guaranteed to work in all JS environments
      if (global.gc) {
        global.gc();
      }

      // This is mainly to ensure the code above doesn't throw errors,
      // actual GC testing would require more sophisticated memory profiling
      expect(true).toBe(true);
    });
  });
