import { describe, test, expect } from "bun:test";
import { effect, signal } from "../../lib";
import { tick } from "../setup";

export const effectChains = () =>
  describe("chains", () => {
    test("should handle chain of effects with circular updates", async () => {
      const a = signal(0);
      const b = signal(10);
      const executionCounts = {
        effectA: 0,
        effectB: 0,
      };

      // Create two effects that update each other's dependencies
      const disposeA = effect(() => {
        const valueA = a();
        executionCounts.effectA++;

        if (valueA < 3) {
          // Use setTimeout to break the synchronous execution chain
          setTimeout(() => b.set(valueA + 10), 0);
        }
      });

      const disposeB = effect(() => {
        const valueB = b();
        executionCounts.effectB++;

        if (valueB < 13 && valueB > 10) {
          // Use setTimeout to break the synchronous execution chain
          setTimeout(() => a.set(a() + 1), 0);
        }
      });

      // Trigger the initial update
      a.set(1);

      // Wait for all the timeouts to complete
      await tick();

      expect(a()).toBe(3);
      expect(b()).toBe(12);
      expect(executionCounts.effectA).toBeGreaterThan(2);
      expect(executionCounts.effectB).toBeGreaterThan(2);

      disposeA();
      disposeB();
    });

    test("should handle stateful dependency tracking with changing dependencies", () => {
      const toggler = signal(true);
      const a = signal(1);
      const b = signal(2);
      const executionCount = signal(0);

      effect(() => {
        executionCount.update((n) => n + 1);

        // Only track the signal that is currently active
        if (toggler()) {
          a();
        } else {
          b();
        }
      });

      expect(executionCount()).toBe(1);

      // This update should trigger the effect
      a.set(10);
      expect(executionCount()).toBe(2);

      // This update should not trigger it
      b.set(20);
      expect(executionCount()).toBe(2);

      // Switch the tracker
      toggler.set(false);
      expect(executionCount()).toBe(3);

      // Now a shouldn't trigger but b should
      a.set(100);
      expect(executionCount()).toBe(3);

      b.set(200);
      expect(executionCount()).toBe(4);
    });
  });
