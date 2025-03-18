import { describe, test, expect, mock } from "bun:test";
import { signal, computed, batch, type Signal } from "../../../lib";

export const computedCombinations = (count: Signal<number>) =>
  describe("multiple", () => {
    test("should handle multiple options together", () => {
      // Tests that multiple computed options can be combined correctly
      // Verifies that name, keepAlive, onError and onComputed all work together
      const source = signal(0);
      const errorHandler = mock();
      const computedCallback = mock();

      // Create computed with multiple options
      const value = computed(
        () => {
          if (source() < 0) throw new Error("Negative value");
          return source() * 10;
        },
        {
          name: "multiOptions",
          keepAlive: true,
          onError: errorHandler,
          onComputed: computedCallback,
        }
      );

      // Initial computation with all options working
      expect(value()).toBe(0);
      expect(computedCallback).toHaveBeenCalledWith(0);

      // Normal update with all options working
      source.set(5);
      expect(computedCallback).toHaveBeenCalledWith(50);
      expect(value()).toBe(50);

      // Error case - should call error handler
      source.set(-1);
      expect(errorHandler).toHaveBeenCalled();
      expect(() => value()).not.toThrow();
    });

    test("should maintain behavior in batch operations", () => {
      // Tests that computed options maintain their behavior correctly
      // when used with batch operations for multiple updates
      const batchSignal = signal(2);
      const computedFn = mock(() => count() + batchSignal());
      const onComputedMock = mock();

      // Create keepAlive computed to test batch behavior
      const sum = computed(computedFn, {
        keepAlive: true,
        onComputed: onComputedMock,
      });

      // Initial state
      expect(sum()).toBe(3); // count(1) + batchSignal(2) = 3
      expect(onComputedMock).toHaveBeenCalledTimes(1);

      // Batch multiple updates together
      batch(() => {
        count.set(10);
        batchSignal.set(20);
      });

      // Batch should only trigger one computation after all updates
      expect(computedFn).toHaveBeenCalledTimes(2);
      expect(onComputedMock).toHaveBeenCalledTimes(2);
      expect(onComputedMock).toHaveBeenLastCalledWith(30);
      expect(sum()).toBe(30); // count(10) + batchSignal(20) = 30
    });
  });
