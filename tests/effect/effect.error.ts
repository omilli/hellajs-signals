import { describe, test, expect, mock } from "bun:test";
import { effect, signal, batch } from "../../lib";
import { effectTick } from "../setup";

export const effectError = () =>
  describe("errors", () => {
    test("should recover gracefully from errors in chained effects", () => {
      const source = signal(0);
      const derived = signal(0);

      const errorHandler1 = mock();
      const errorHandler2 = mock();
      const normalHandler = mock();

      // First effect - throws on odd numbers
      effect(
        () => {
          const value = source();
          if (value % 2 === 1) {
            throw new Error("Odd number detected");
          }
          derived.set(value * 2);
        },
        { onError: errorHandler1 }
      );

      // Second effect - throws on values > 5
      effect(
        () => {
          const value = derived();
          if (value > 5) {
            throw new Error("Value too large");
          }
          normalHandler(value);
        },
        { onError: errorHandler2 }
      );

      // Set source to 1 (odd) - should error in first effect
      source.set(1);
      expect(errorHandler1).toHaveBeenCalledTimes(1);
      expect(derived()).toBe(0); // Derived unchanged due to error

      // Set source to 2 (even) - should update derived to 4
      source.set(2);
      expect(derived()).toBe(4);
      expect(normalHandler).toHaveBeenLastCalledWith(4);

      // Set source to 4 - should update derived to 8, triggering second error
      source.set(4);
      expect(derived()).toBe(8);
      expect(errorHandler2).toHaveBeenCalledTimes(1);
    });

    test("should properly propagate errors in effect hierarchy", () => {
      const parent = signal(0);
      const child = signal(0);
      const grandchild = signal(0);

      const parentError = mock();
      const childError = mock();
      const normalRun = mock();

      // Parent effect updates child signal
      effect(() => {
        try {
          const value = parent();
          child.set(value * 2);
        } catch (err) {
          parentError(err);
          throw err; // Re-throw to test propagation
        }
      });

      // Child effect that can throw
      effect(
        () => {
          const value = child();
          if (value > 5) {
            throw new Error("Child value too large");
          }
          grandchild.set(value + 1);
          normalRun();
        },
        { onError: childError }
      );

      // Initial state
      expect(grandchild()).toBe(1); // 0*2 + 1
      expect(normalRun).toHaveBeenCalledTimes(1);

      // Update to valid value
      parent.set(2);
      expect(child()).toBe(4);
      expect(grandchild()).toBe(5);
      expect(normalRun).toHaveBeenCalledTimes(2);

      // Update to trigger error in child
      parent.set(3);
      expect(child()).toBe(6);
      expect(grandchild()).toBe(5); // Unchanged due to error
      expect(childError).toHaveBeenCalledTimes(1);
      expect(normalRun).toHaveBeenCalledTimes(2); // No additional call
    });

    test("should handle recursive updates with batching", async () => {
      const counter = signal(0);
      const iterations = signal(0);
      const maxCount = 3;

      // Use this to track updates
      const updates: number[] = [];

      effect(() => {
        const currentCounter = counter();
        iterations.update((i) => i + 1);
        updates.push(currentCounter);

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

      // Wait for all the timeouts to complete
      await effectTick();

      // Counter should have reached max
      expect(counter()).toBe(maxCount);
      // Should have run iterations.length + 1 times
      expect(iterations()).toBe(maxCount + 1);
      // Should have seen all counter values
      expect(updates).toEqual([0, 1, 2, 3]);
    });

    test("should handle multiple chained errors gracefully", () => {
      const source = signal(0);
      const errors = {
        level1: 0,
        level2: 0,
        level3: 0,
      };

      // Level 1 effect - errors on values divisible by 2
      effect(
        () => {
          const value = source();
          if (value % 2 === 0 && value !== 0) throw new Error("Level 1 error");
        },
        {
          onError: () => errors.level1++,
        }
      );

      // Level 2 effect - errors on values divisible by 3
      effect(
        () => {
          const value = source();
          if (value % 3 === 0 && value !== 0) throw new Error("Level 2 error");
        },
        {
          onError: () => errors.level2++,
        }
      );

      // Level 3 effect - errors on values divisible by 5
      effect(
        () => {
          const value = source();
          if (value % 5 === 0 && value !== 0) throw new Error("Level 3 error");
        },
        {
          onError: () => errors.level3++,
        }
      );

      // No errors initially
      expect(errors).toEqual({ level1: 0, level2: 0, level3: 0 });

      // Trigger error in level 1
      source.set(2);
      expect(errors).toEqual({ level1: 1, level2: 0, level3: 0 });

      // Trigger error in level 2
      source.set(3);
      expect(errors).toEqual({ level1: 1, level2: 1, level3: 0 });

      // Trigger error in level 3
      source.set(5);
      expect(errors).toEqual({ level1: 1, level2: 1, level3: 1 });

      // Trigger errors in levels 1 and 2 simultaneously
      source.set(6); // Divisible by both 2 and 3
      expect(errors).toEqual({ level1: 2, level2: 2, level3: 1 });

      // Trigger errors in all levels simultaneously
      source.set(30); // Divisible by 2, 3, and 5
      expect(errors).toEqual({ level1: 3, level2: 3, level3: 2 });
    });
  });
