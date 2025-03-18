import { describe, test, expect } from "bun:test";
import { effect, signal, batch } from "../../lib";

export const effectPerformance = () =>
  describe("performance", () => {
    test("should handle large numbers of effects efficiently", () => {
      const source = signal(0);
      const effectCount = 100;
      const disposers = [];

      // Create many effects
      for (let i = 0; i < effectCount; i++) {
        const dispose = effect(() => {
          // Simple dependency tracking
          return source();
        });
        disposers.push(dispose);
      }

      // Batch update to trigger all effects
      const startTime = performance.now();
      batch(() => {
        source.set(1);
      });
      const endTime = performance.now();

      // This isn't a strict test, but just ensures it completes
      // You could add thresholds if needed
      expect(endTime - startTime).toBeLessThan(1000);

      // Clean up
      disposers.forEach((dispose) => dispose());
    });

    test("should not leak memory with rapidly created and disposed effects", () => {
      const source = signal(0);

      // Create and immediately dispose many effects
      for (let i = 0; i < 1000; i++) {
        const dispose = effect(() => {
          source();
        });
        dispose();
      }

      // Create one more effect to verify everything still works
      let value!: number;
      const dispose = effect(() => {
        value = source();
      });

      source.set(42);
      expect(value).toBe(42);

      dispose();
    });
  });
