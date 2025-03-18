import { describe, test, expect } from "bun:test";
import { effect, signal, batch } from "../../lib";
import { effectTick } from "../setup";

export const effectCombinations = () =>
  describe("feature combinations", () => {
    test("should handle priority with debouncing", async () => {
      const source = signal(0);
      const executionOrder: string[] = [];

      // High priority + long debounce
      effect(
        () => {
          source();
          executionOrder.push("high");
        },
        { priority: 10, debounce: 50, name: "high" }
      );

      // Low priority + no debounce
      effect(
        () => {
          source();
          executionOrder.push("low");
        },
        { priority: 1, name: "low" }
      );

      // Clear initial execution
      executionOrder.length = 0;

      // Update source
      source.set(1);

      // Low priority but no debounce should run immediately
      expect(executionOrder).toEqual(["low"]);

      // Wait for debounced high priority effect
      await effectTick();

      // Despite higher priority, debounced effect runs later
      expect(executionOrder).toEqual(["low", "high"]);
    });

    test("should handle scheduler with batch operations", () => {
      const source = signal(0);
      const schedulerCalls: number[] = [];

      const customScheduler = (run: () => void) => {
        schedulerCalls.push(source());
        run();
      };

      effect(() => source(), { scheduler: customScheduler });

      // Batch multiple updates
      batch(() => {
        source.set(1);
        source.set(2);
        source.set(3);
      });

      // Scheduler should be called exactly once after batch
      // with the final value
      expect(schedulerCalls).toEqual([0, 3]);
    });
  });
