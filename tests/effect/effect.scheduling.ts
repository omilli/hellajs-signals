import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";

export const effectScheduling = () =>
  describe("scheduling", () => {
    test("should respect priority in complex dependency graphs", () => {
      const source = signal(0);
      const executionOrder: string[] = [];

      // Create three effects with different priorities
      effect(
        () => {
          source();
          executionOrder.push("low");
        },
        { priority: 1, name: "low" }
      );

      effect(
        () => {
          source();
          executionOrder.push("medium");
        },
        { priority: 5, name: "medium" }
      );

      effect(
        () => {
          source();
          executionOrder.push("high");
        },
        { priority: 10, name: "high" }
      );

      // Clear initial execution
      executionOrder.length = 0;

      // Update source to trigger all effects
      source.set(1);

      // Higher priority should run first
      expect(executionOrder).toEqual(["high", "medium", "low"]);
    });

    test("should apply custom scheduler correctly", () => {
      const value = signal(0);
      const effectMock = mock();
      let schedulerCalled = false;

      // Custom scheduler that tracks being called
      const customScheduler = (run: () => void) => {
        schedulerCalled = true;
        // Execute the effect
        run();
      };

      effect(
        () => {
          value();
          effectMock();
        },
        {
          scheduler: customScheduler,
        }
      );

      // Should have used our custom scheduler
      expect(schedulerCalled).toBe(true);
      expect(effectMock).toHaveBeenCalledTimes(1);

      // Reset to test update
      schedulerCalled = false;

      // Update value
      value.set(1);

      // Scheduler should be called again for the update
      expect(schedulerCalled).toBe(true);
      expect(effectMock).toHaveBeenCalledTimes(2);
    });
  });
