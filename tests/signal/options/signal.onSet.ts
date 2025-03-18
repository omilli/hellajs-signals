import { describe, test, expect, mock } from "bun:test";
import { signal } from "../../../lib";
import { errorSpy, tick } from "../../setup";

export const signalOnSet = () =>
  describe("onSet", () => {
    // Basic test for onSet callback when signal value changes
    test("should call onSet hook when value changes", () => {
      const onSet = mock();
      const count = signal(0, { onSet });

      count.set(5);

      // onSet receives new value and previous value as arguments
      expect(onSet).toHaveBeenCalledWith(5, 0);
    });

    // Tests error handling in onSet hooks
    // Signal updates should still work even if onSet hook throws
    test("should handle errors in onSet hook", () => {
      const spy = errorSpy();
      const count = signal(0, {
        name: "errorHook",
        onSet: () => {
          throw new Error("Hook error");
        },
      });

      // Error in onSet should not prevent signal update
      expect(() => count.set(5)).not.toThrow();
      expect(count()).toBe(5);

      // Error should be caught and logged
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toContain('onSet error: "errorHook"');

      spy.mockRestore();
    });

    // Tests async operations in onSet hooks
    // Signal updates should not be blocked by async operations
    test("should handle async operations in onSet hook", async () => {
      const results: number[] = [];
      const asyncCounter = signal(0, {
        name: "asyncCounter",
        onSet: async (newValue) => {
          await tick(10); // Simulate async operation
          results.push(newValue as number);
        },
      });

      // Multiple updates before async operations complete
      asyncCounter.set(1);
      asyncCounter.set(2);

      await tick(20); // Wait for async operations to complete

      // All updates should be processed
      expect(results).toEqual([1, 2]);
    });

    // Tests that onSet provides access to both old and new values
    test("should provide both old and new values to onSet", () => {
      const valueHistory: Array<{ old: number; new: number }> = [];

      const tracked = signal(0, {
        onSet: (newVal, oldVal) => {
          valueHistory.push({ old: oldVal as number, new: newVal as number });
        },
      });

      tracked.set(1);
      tracked.set(5);
      tracked.set(10);

      // Each update should record both old and new values
      expect(valueHistory).toEqual([
        { old: 0, new: 1 },
        { old: 1, new: 5 },
        { old: 5, new: 10 },
      ]);
    });
  });
