import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";

export const effectAsync = () =>
  describe("async", () => {
    test("should handle async errors in effects", async () => {
      const trigger = signal(false);
      const errorHandler = mock();

      effect(
        async () => {
          if (trigger()) {
            // Create a promise that will reject
            await new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Async error")), 10)
            );
          }
        },
        {
          onError: errorHandler,
        }
      );

      // Trigger the error
      trigger.set(true);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Error should have been caught by handler
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    test("should handle chained promises in effects", async () => {
      const count = signal(0);
      const result = signal("");
      const executionTracker = mock();

      effect(async () => {
        executionTracker();
        const value = count();

        // Multi-step async process
        await Promise.resolve();
        result.set(`step1-${value}`);

        await Promise.resolve();
        result.set(`step2-${value}`);
      });

      // Initial execution
      expect(executionTracker).toHaveBeenCalledTimes(1);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(result()).toBe("step2-0");

      // Update trigger
      count.set(5);
      expect(executionTracker).toHaveBeenCalledTimes(2);

      // Wait for new async chain
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(result()).toBe("step2-5");
    });

    test("should support mixing sync and async effects", async () => {
      const source = signal(0);
      const syncEffect = mock();
      const asyncEffect = mock();

      // Synchronous effect
      effect(() => {
        source();
        syncEffect();
      });

      // Asynchronous effect
      effect(async () => {
        const value = source();
        await Promise.resolve();
        asyncEffect(value);
      });

      expect(syncEffect).toHaveBeenCalledTimes(1);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(asyncEffect).toHaveBeenCalledTimes(1);

      // Update source
      source.set(5);

      expect(syncEffect).toHaveBeenCalledTimes(2);

      // Wait again for async effect
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(asyncEffect).toHaveBeenCalledTimes(2);
      expect(asyncEffect).toHaveBeenLastCalledWith(5);
    });
  });
