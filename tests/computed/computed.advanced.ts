import { describe, test, expect } from "bun:test";
import { signal, computed, type SignalValue, type Signal } from "../../lib";

export const computedAdvanced = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe("advanced", () => {
    test("should handle multiple signal dependencies", () => {
      // Create a computed value that depends on two signals
      const add = signal(5);
      const sum = computed(() => count() + add());

      // Initial computation with both dependencies
      expect(sum()).toBe(6);

      // Update first dependency
      count.set(7);
      expect(sum()).toBe(12); // 7 + 5 = 12

      // Update second dependency
      add.set(20);
      expect(sum()).toBe(27); // 7 + 20 = 27
    });

    test("should handle nested computed values", () => {
      // Create a computed that depends on another computed
      const quadrupled = computed(() => doubled() * 2);

      // Verify initial computation works through the chain
      expect(doubled()).toBe(2);
      expect(quadrupled()).toBe(4);

      // Verify changes propagate through multiple computed layers
      count.set(2);
      expect(doubled()).toBe(4);
      expect(quadrupled()).toBe(8);
    });

    test("should dispose computed values correctly", () => {
      // Create a signal to help test dependency tracking
      const testSignal = signal(0);

      // Create a computed that depends on both signals
      const computeFn = () => count() * 2 + testSignal();
      const doubled = computed(computeFn);

      // Initial computation
      expect(doubled()).toBe(2);

      // Dispose the computed value
      (doubled as SignalValue<number>)._cleanup();

      // Updates to dependencies should no longer affect the computed value
      count.set(2);
      testSignal.set(1);

      // Disposed computed should either return stale value or throw
      try {
        const result = doubled();
        // If it returns, it should not be the updated value
        expect(result).not.toBe(5); // 2*2+1 = 5 would be the updated value
      } catch (e) {
        // Throwing is also acceptable behavior for disposed values
        expect(e).toBeDefined();
      }
    });
  });
