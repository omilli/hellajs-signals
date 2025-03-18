import { describe, test, expect, mock } from "bun:test";
import { effect, signal, batch } from "../../lib";

export const effectMicrotasks = () =>
  describe("microtasks", () => {
    test("should properly handle signal updates in promises", async () => {
      const source = signal(0);
      const derived = signal(0);
      const effectRuns = mock();

      effect(() => {
        derived.set(source() * 2);
        effectRuns();
      });

      // Initial run
      expect(effectRuns).toHaveBeenCalledTimes(1);
      expect(derived()).toBe(0);

      // Update in a promise
      await Promise.resolve().then(() => {
        source.set(5);
      });

      // Effect should have run again
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(derived()).toBe(10);
    });

    test("should handle effects created in microtasks", async () => {
      const source = signal(0);
      const effectCreated = signal(false);
      const nestedEffectRun = mock();

      // Create an effect in a microtask
      await Promise.resolve().then(() => {
        effect(() => {
          source();
          nestedEffectRun();
          effectCreated.set(true);
        });
      });

      expect(effectCreated()).toBe(true);
      expect(nestedEffectRun).toHaveBeenCalledTimes(1);

      // Update source
      source.set(1);
      expect(nestedEffectRun).toHaveBeenCalledTimes(2);
    });

    test("should handle effect/microtask interaction with batching", async () => {
      const a = signal(1);
      const b = signal(2);
      const sum = signal(0);
      const effectRun = mock();

      effect(() => {
        sum.set(a() + b());
        effectRun();
      });

      expect(effectRun).toHaveBeenCalledTimes(1);
      expect(sum()).toBe(3);

      // Create complex async update pattern
      await Promise.resolve().then(() => {
        batch(() => {
          a.set(10);

          // Nested microtask within batch
          Promise.resolve().then(() => {
            // This shouldn't run until after the current batch
            b.set(20);
          });

          // Batch should complete before nested microtask
        });
      });

      // Wait for all microtasks to complete
      await Promise.resolve();

      // Effect should have run twice (once for batch, once for nested update)
      expect(effectRun).toHaveBeenCalledTimes(3);
      expect(sum()).toBe(30); // 10 + 20
    });
  });
