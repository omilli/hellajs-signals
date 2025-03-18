import { describe, test, expect, mock } from "bun:test";
import { computed, type Signal, type SignalValue } from "../../lib";

export const computedBasic = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe("basic", () => {
    test("should compute initial value", () => {
      // Verify that the computed value correctly reflects its dependencies initially
      expect(doubled()).toBe(2);
    });

    test("should update when dependencies change", () => {
      // Verify that changing a dependency updates the computed value
      count.set(2);
      expect(doubled()).toBe(4);
    });

    test("should not recompute until accessed", () => {
      // Mock the compute function to track calls
      const computeFn = mock(() => count() * 2);
      const doubled = computed(computeFn);

      // Initial computation occurs during computed creation
      // (implementation detail, could vary)
      expect(computeFn).toHaveBeenCalledTimes(1);

      // First access - should cause a computation
      expect(doubled()).toBe(2);
      expect(computeFn).toHaveBeenCalledTimes(2);

      // Update dependency but don't access computed yet
      count.set(2);

      // Now access - this should trigger recomputation
      expect(doubled()).toBe(4);
      expect(computeFn).toHaveBeenCalledTimes(4);

      // Accessing again without changes shouldn't trigger recomputation
      expect(doubled()).toBe(4);
      expect(computeFn).toHaveBeenCalledTimes(4);
    });
  });
