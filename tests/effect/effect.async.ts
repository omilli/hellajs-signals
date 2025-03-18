import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";
import { tick } from "../setup";

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
      await tick();

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
      await tick(20);
      expect(result()).toBe("step2-0");

      // Update trigger
      count.set(5);
      expect(executionTracker).toHaveBeenCalledTimes(2);

      // Wait for new async chain
      await tick(20);
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
      await tick(10);
      expect(asyncEffect).toHaveBeenCalledTimes(1);

      // Update source
      source.set(5);

      expect(syncEffect).toHaveBeenCalledTimes(2);

      // Wait again for async effect
      await tick(10);
      expect(asyncEffect).toHaveBeenCalledTimes(2);
      expect(asyncEffect).toHaveBeenLastCalledWith(5);
    });

    test("should support cancellation token for async effects", async () => {
      const source = signal(0);
      const results: string[] = [];
      let controller = new AbortController();

      effect(async () => {
        // Current signal to use for this execution
        const signal = controller.signal;
        const value = source();

        try {
          // Simulate long operation
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 100);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new Error("Cancelled"));
            });
          });

          // Only record if not cancelled
          if (!signal.aborted) {
            results.push(`completed-${value}`);
          }
        } catch (err: any) {
          if (err.message !== "Cancelled") throw err;
          results.push(`cancelled-${value}`);
        }
      });

      // Start a long operation
      source.set(1);

      // Cancel current operation and start a new one
      await new Promise((r) => setTimeout(r, 10));
      controller.abort();
      controller = new AbortController();
      source.set(2);

      // Wait for completion
      await new Promise((r) => setTimeout(r, 150));
      expect(results).toContain("cancelled-1");
      expect(results).toContain("completed-2");
    });
  });
