import { describe, test, expect, mock } from "bun:test";
import { computed, type Signal } from "../../../lib";

export const computedKeepAlive = (count: Signal<number>) =>
  describe("keepAlive option", () => {
    test("should compute value immediately when dependencies change", () => {
      // Mock to track computation function calls
      const computeFn = mock(() => count() * 2);

      // Create computed with keepAlive option
      const doubled = computed(computeFn, { keepAlive: true });

      // Initial computation happens when created with keepAlive
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Update dependency - should trigger immediate recomputation
      count.set(2);
      expect(computeFn).toHaveBeenCalledTimes(2);

      // Access should use cached value, not recompute
      expect(doubled()).toBe(4);
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    test("should compare keepAlive vs non-keepAlive behavior", () => {
      // Create one regular computed and one keepAlive computed
      const computeRegular = mock(() => count() * 2);
      const computeKeepAlive = mock(() => count() * 3);

      const regular = computed(computeRegular);
      const keepAlive = computed(computeKeepAlive, { keepAlive: true });

      // Both get computed initially (implementation detail, could vary)
      expect(computeRegular).toHaveBeenCalledTimes(1);
      expect(computeKeepAlive).toHaveBeenCalledTimes(1);

      // Access both to ensure initial values
      expect(regular()).toBe(2);
      expect(keepAlive()).toBe(3);

      // Update the shared dependency
      count.set(10);

      // Regular's behavior may vary by implementation - expected to run for deps tracking
      // but not necessarily value computation
      expect(computeRegular).toHaveBeenCalledTimes(3);

      // keepAlive should recompute immediately when dependencies change
      expect(computeKeepAlive).toHaveBeenCalledTimes(2);

      // Accessing regular should trigger full computation
      expect(regular()).toBe(20);
      expect(computeRegular).toHaveBeenCalledTimes(4);

      // Accessing keepAlive should use cached value
      expect(keepAlive()).toBe(30);
      expect(computeKeepAlive).toHaveBeenCalledTimes(2);
    });
  });
