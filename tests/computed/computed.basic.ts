import { describe, test, expect, mock } from "bun:test";
import { computed, type Signal, type SignalValue } from "../../lib";
import { testCategories } from "../setup";

export const computedBasic = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe(testCategories.basic, () => {
    test("should compute initial value", () => {
      expect(doubled()).toBe(2);
    });

    test("should update when dependencies change", () => {
      count.set(2);
      expect(doubled()).toBe(4);
    });

    test("should not recompute until accessed", () => {
      const computeFn = mock(() => count() * 2);
      const doubled = computed(computeFn);

      // Initial comput});ation happens once when creating the computed
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Access the value
      expect(doubled()).toBe(2);

      // Update dependency but don't access computed
      count.set(2);
      expect(computeFn).toHaveBeenCalledTimes(3);

      // Access the computed value
      expect(doubled()).toBe(4);
      expect(computeFn).toHaveBeenCalledTimes(4);

      // Access again without changing dependency
      expect(doubled()).toBe(4);
      expect(computeFn).toHaveBeenCalledTimes(4); // Cached value is used
    });
  });
