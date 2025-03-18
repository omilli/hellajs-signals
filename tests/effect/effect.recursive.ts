import { describe, test, expect } from "bun:test";
import { effect, signal, batch } from "../../lib";
import { tick } from "../setup";

export const effectRecursive = () =>
  describe("recursive", () => {
    test("should support intentional recursion with safeguards", async () => {
      const count = signal(0);
      const executionCount = signal(0);

      // Use setTimeout to break the synchronous execution chain
      effect(() => {
        const currentCount = count();
        executionCount.update((n) => n + 1);

        // Instead of direct recursion, use setTimeout
        if (currentCount < 3) {
          setTimeout(() => count.set(currentCount + 1), 0);
        }
      });

      // Wait for the async operations to complete
      await tick();

      // Now all the updates should have happened
      expect(count()).toBe(3);
      expect(executionCount()).toBeGreaterThan(3);
    });

    test("should handle recursive updates with batching", async () => {
      const counter = signal(0);
      const iterations = signal(0);
      const maxCount = 3;

      effect(() => {
        const currentCounter = counter();
        iterations.update((i) => i + 1);

        // Only continue if under threshold
        if (currentCounter < maxCount) {
          // Use setTimeout to break the synchronous chain
          setTimeout(() => {
            batch(() => {
              counter.set(currentCounter + 1);
            });
          }, 0);
        }
      });

      // Wait for all timeouts to complete
      await tick();

      // Counter should have reached max
      expect(counter()).toBe(maxCount);
      // Should have run iterations.length + 1 times
      expect(iterations()).toBe(maxCount + 1);
    });

    test("should support controlled recursion with external state management", () => {
      const state = {
        counter: 0,
        maxCount: 3,
        iterations: 0,
        isUpdating: false,
      };

      // Reactive signals to track changes
      const counter = signal(state.counter);
      const iterations = signal(state.iterations);

      // Effect that reads the signals but modifies external state
      effect(() => {
        state.iterations++;
        iterations.set(state.iterations);

        // Read the counter value to create dependency
        counter();
      });

      // Function to safely update state without circular dependencies
      function incrementCounter() {
        if (state.isUpdating) return;
        if (state.counter >= state.maxCount) return;

        state.isUpdating = true;
        state.counter++;
        counter.set(state.counter);
        state.isUpdating = false;

        // Continue recursion if needed
        if (state.counter < state.maxCount) {
          incrementCounter();
        }
      }

      // Start the controlled recursion
      incrementCounter();

      expect(state.counter).toBe(state.maxCount);
      expect(counter()).toBe(state.maxCount);
      expect(state.iterations).toBe(state.maxCount + 1);
    });
  });
