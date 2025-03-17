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

      // Computation happens only once when creating the computed
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Access the value
      expect(doubled()).toBe(2);

      expect(computeFn).toHaveBeenCalledTimes(2);

      // Update dependency but don't access computed
      count.set(2);

      // Access the computed value - this will see the outdated cached value
      expect(doubled()).toBe(4);
      // Now the computation should have run
      expect(computeFn).toHaveBeenCalledTimes(4);

      // Access again without changing dependency
      expect(doubled()).toBe(4);
      // No additional computation should happen
      expect(computeFn).toHaveBeenCalledTimes(4);
    });
  });
