import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";

export const effectCleanup = () =>
  describe("cleanup", () => {
    test("should handle nested cleanup functions correctly", () => {
      const resources = { allocated: 0 };
      const cleanupCalls: string[] = [];

      const allocate = () => {
        resources.allocated++;
        return () => {
          resources.allocated--;
          cleanupCalls.push("resource");
        };
      };

      // Effect that registers multiple resources for cleanup
      const dispose = effect(() => {
        const cleanup1 = allocate();
        const cleanup2 = allocate();

        return () => {
          cleanupCalls.push("start");
          cleanup1();
          cleanup2();
          cleanupCalls.push("end");
        };
      });

      expect(resources.allocated).toBe(2);

      // Dispose should clean up all resources in the right order
      dispose();

      expect(resources.allocated).toBe(0);
      expect(cleanupCalls).toEqual(["start", "resource", "resource", "end"]);
    });

    test("should handle disposal during effect execution", () => {
      const source = signal(0);
      const executionTracker = mock();
      let effectDisposer: () => void;

      // Self-disposing effect
      effectDisposer = effect(() => {
        const value = source();
        executionTracker(value);

        // Self-dispose when value reaches threshold
        if (value >= 3) {
          effectDisposer();
        }
      });

      // Initial run
      expect(executionTracker).toHaveBeenCalledWith(0);

      // Updates should run normally until threshold
      source.set(1);
      expect(executionTracker).toHaveBeenCalledWith(1);

      source.set(2);
      expect(executionTracker).toHaveBeenCalledWith(2);

      // This update causes self-disposal
      source.set(3);
      expect(executionTracker).toHaveBeenCalledWith(3);

      // After self-disposal, no further updates should trigger the effect
      source.set(4);
      expect(executionTracker).not.toHaveBeenCalledWith(4);
    });
  });
