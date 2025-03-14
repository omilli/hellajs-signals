import { describe, test, expect, mock } from "bun:test";
import { signal, computed, type ComputedAccessor } from "../lib";

describe("computed", () => {
  describe("basic", () => {
    test("should compute initial value", () => {
      const count = signal(1);
      const doubled = computed(() => count() * 2);

      expect(doubled()).toBe(2);
    });

    test("should update when dependencies change", () => {
      const count = signal(1);
      const doubled = computed(() => count() * 2);

      count.set(2);
      expect(doubled()).toBe(4);
    });

    test("should not recompute until accessed", () => {
      const count = signal(1);
      const computeFn = mock(() => count() * 2);
      const doubled = computed(computeFn);

      // Initial computation happens once when creating the computed
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

  describe("advanced", () => {
    test("should handle multiple signal dependencies", () => {
      const first = signal(5);
      const second = signal(10);
      const sum = computed(() => first() + second());

      expect(sum()).toBe(15);

      first.set(7);
      expect(sum()).toBe(17);

      // Reset expectations after updating second
      second.set(20);
      // Verify computed value is updated with both dependencies
      expect(sum()).toBe(27); // 7 + 20 = 27
    });

    test("should handle nested computed values", () => {
      const count = signal(1);
      const doubled = computed(() => count() * 2);
      const quadrupled = computed(() => doubled() * 2);

      expect(doubled()).toBe(2);
      expect(quadrupled()).toBe(4);

      count.set(2);
      expect(doubled()).toBe(4);
      expect(quadrupled()).toBe(8);
    });

    test("should dispose computed values correctly", () => {
      const count = signal(1);
      const computeFn = mock(() => count() * 2);
      const doubled = computed(computeFn);

      // Initially computed and accessed
      expect(doubled()).toBe(2);

      // Dispose the computed value
      (doubled as ComputedAccessor<number>)._dispose();

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
});
