import { describe, test, expect } from "bun:test";
import { effect, signal } from "../../lib";

export const effectRace = () =>
  describe("race", () => {
    test("should handle concurrent async effects correctly", async () => {
      const source = signal(0);
      const results: string[] = [];

      // Create an effect with slow async processing
      effect(async () => {
        const value = source();
        // Simulate varying processing times
        await new Promise((r) => setTimeout(r, value === 1 ? 50 : 10));
        results.push(`processed-${value}`);
      });

      // Trigger multiple updates in quick succession
      source.set(1);
      source.set(2);

      // Wait for all processing to complete
      await new Promise((r) => setTimeout(r, 100));

      // Results should reflect the effect running for both values
      // in the correct order despite different processing times
      expect(results).toContain("processed-0");
      expect(results).toContain("processed-1");
      expect(results).toContain("processed-2");
      expect(results.length).toBe(3);
    });

    test("should synchronize async effects with cleanup", async () => {
      const toggle = signal(true);
      const counter = signal(0);
      const completedOperations: number[] = [];

      // Effect with async operation that can be interrupted
      const dispose = effect(async () => {
        if (!toggle()) return;

        const currentCount = counter();

        // Simulate async work
        await new Promise((r) => setTimeout(r, 20));

        // Only record if the effect is still relevant
        if (!toggle()) return;
        completedOperations.push(currentCount);
      });

      // Start a long-running operation
      counter.set(1);

      // Wait a bit but not enough to complete
      await new Promise((r) => setTimeout(r, 10));

      // Cancel current operations by toggling off
      toggle.set(false);

      // Dispose completely
      dispose();

      // Wait to ensure any pending operations complete
      await new Promise((r) => setTimeout(r, 30));

      // No operations should complete after toggle off
      expect(completedOperations).toEqual([]);
    });
  });
