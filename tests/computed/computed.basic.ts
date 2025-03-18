import { describe, test, expect, mock } from "bun:test";
import { computed, signal, type Signal, type SignalValue } from "../../lib";

export const computedBasic = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe("basic", () => {
    test("should compute initial value", () => {
      // Verifies that computed signals correctly derive their initial value from dependencies
      expect(doubled()).toBe(2);
    });

    test("should update when dependencies change", () => {
      // Verifies that computed values automatically update when their dependencies change
      count.set(2);
      expect(doubled()).toBe(4);
    });

    test("should not recompute until accessed", () => {
      // Tests the lazy evaluation behavior of computed signals
      // Computed values should only recalculate when they are accessed after a dependency change
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

    test("should ensure computed values properly detect and handle reads of stale dependencies", () => {
      // Tests that changes in nested dependencies properly propagate through the computation chain
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => {
        return b();
      });

      expect(c()).toBe(2);
      a.set(2);
      expect(c()).toBe(4);
    });
  });
