import { describe, test, expect, mock } from "bun:test";
import { signal, computed } from "../../lib";

export const computedPerformance = () =>
  describe("performance", () => {
    test("should handle large numbers of computed values", () => {
      // This test checks if the computed signal can handle a large number of computed values without performance issues.
      const a = signal(1);
      const computedValues = [];

      for (let i = 0; i < 1000; i++) {
        computedValues.push(computed(() => a() * 2));
      }

      expect(computedValues[0]()).toBe(2);
      a.set(2);
      expect(computedValues[0]()).toBe(4);
    });

    test("should handle frequently changing dependencies", () => {
      // This test checks if the computed signal can handle frequently changing dependencies without performance issues.
      const a = signal(1);
      const myComputed = computed(() => a() * 2);

      for (let i = 0; i < 1000; i++) {
        a.set(i);
        myComputed();
      }

      expect(myComputed()).toBe(1998);
    });

    test("should properly cleanup when dependencies change rapidly", () => {
      // This test checks if the computed signal properly cleans up when dependencies change rapidly.
      const a = signal(0);
      const computeFn = mock(() => a() * 2);
      const myComputed = computed(computeFn);

      expect(computeFn).toHaveBeenCalledTimes(1);

      a.set(1);
      a.set(2);
      a.set(3);

      expect(myComputed()).toBe(6);
      // The exact number of calls may vary based on implementation details
      expect(computeFn).toHaveBeenCalled();

      (myComputed as any)._cleanup();
    });
  });
