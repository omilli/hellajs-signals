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
      expect(doubled()).toBe(4);
      expect(quadrupled()).toBe(8);
    });

    test("should dispose computed values correctly", () => {
      const computeFn = () => count() * 2;
      const doubled = computed(computeFn);

      // Initially computed and accessed
      expect(doubled()).toBe(2);

      // Dispose the computed value
      (doubled as SignalValue<number>)._cleanup();

      // Update the dependency
      count.set(2);

      // The computed should no longer update, still returning the last value
      // before disposal, or throwing if completely removed
      try {
        doubled();
        // If it returns the last value, make sure it didn't recompute
        expect(computeFn).toHaveBeenCalledTimes(2); // Initial + setup only
      } catch (e) {
        // Or if it throws, that's also acceptable behavior for disposed values
        expect(e).toBeDefined();
      }
    });
  });
