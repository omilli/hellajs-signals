import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";
import { tick } from "../setup";

export const effectEdgeCases = () =>
  describe("edge", () => {
    test("should handle changes to dependencies during effect execution", async () => {
      const count = signal(0);
      const executionCount = signal(0);

      effect(() => {
        const currentCount = count();
        executionCount.update((n) => n + 1);

        // Change the dependency during execution with setTimeout
        if (currentCount < 3) {
          setTimeout(() => count.set(currentCount + 1), 0);
        }
      });

      // Wait for the timeouts to complete
      await tick();

      // The effect should have self-triggered a few times but then stopped
      expect(count()).toBe(3);
      expect(executionCount()).toBeGreaterThan(1);
    });

    test("should handle errors thrown in multiple dependent effects", () => {
      const source = signal(0);
      const errorSpy = mock();

      // First effect throws an error
      effect(
        () => {
          source();
          throw new Error("First effect error");
        },
        {
          onError: errorSpy,
        }
      );

      // Second effect also depends on source
      effect(() => {
        source();
        // This effect runs normally
      });

      // Update source - first effect should error but second should run
      source.set(1);

      // Error handler should be called
      expect(errorSpy).toHaveBeenCalledTimes(2); // Once on init, once on update

      // We got here without crashing, which verifies the error was contained
      expect(source()).toBe(1);
    });

    test("should handle undefined/null dependencies correctly", () => {
      const nullSignal = signal<null>(null);
      const undefinedSignal = signal<undefined>(undefined);
      const effectMock = mock();

      effect(() => {
        nullSignal();
        undefinedSignal();
        effectMock();
      });

      // Initial run
      expect(effectMock).toHaveBeenCalledTimes(1);

      // Update null and undefined values
      nullSignal.set(null); // Same value
      undefinedSignal.set(undefined); // Same value

      // Effect shouldn't run again for same values
      expect(effectMock).toHaveBeenCalledTimes(1);
    });
  });
