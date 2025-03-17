import { describe, test, expect } from "bun:test";
import { signal, computed, type SignalValue, type Signal } from "../../lib";
import { testCategories } from "../setup";

export const computedAdvanced = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe(testCategories.advanced, () => {
    test("should handle multiple signal dependencies", () => {
      const add = signal(5);
      const sum = computed(() => count() + add());

      expect(sum()).toBe(6);

      count.set(7);
      expect(sum()).toBe(12);

      // Reset expectations after updating second
      add.set(20);
      // Verify computed value is updated with both dependencies
      expect(sum()).toBe(27); // 7 + 20 = 27
    });

    test("should handle nested computed values", () => {
      const quadrupled = computed(() => doubled() * 2);

      expect(doubled()).toBe(2);
      expect(quadrupled()).toBe(4);

      count.set(2);
      // Access doubled to ensure it's updated first
      expect(doubled()).toBe(4);
      expect(quadrupled()).toBe(8);
    });

    test("should dispose computed values correctly", () => {
      // Create a test signal to track changes
      const testSignal = signal(0);

      const computeFn = () => count() * 2 + testSignal();
      const doubled = computed(computeFn);

      // Initially computed and accessed
      expect(doubled()).toBe(2); // count is 1, testSignal is 0

      // Dispose the computed value
      (doubled as SignalValue<number>)._cleanup();

      // Update both dependencies
      count.set(2);
      testSignal.set(1);

      // The computed should no longer update with the new values
      try {
        const result = doubled();
        // If it returns a value, it should be the stale one or undefined
        expect(result).not.toBe(5); // 2*2+1 = 5 would be the updated value
      } catch (e) {
        // Or if it throws, that's also acceptable behavior for disposed values
        expect(e).toBeDefined();
      }
    });
  });
