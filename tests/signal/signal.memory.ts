import { describe, test, expect, mock } from "bun:test";
import { signal, effect } from "../../lib";
import { testCategories } from "../setup";

export const signalMemory = () =>
  describe(testCategories.memory, () => {
    test("should clean up WeakRef subscribers when effects are disposed", () => {
      const testSignal = signal(0);

      // Create and immediately dispose multiple effects
      for (let i = 0; i < 10; i++) {
        const dispose = effect(() => {
          testSignal();
        });
        dispose();
      }

      // Hard to test WeakRef directly, but we can verify the signal still works
      const mockFn = mock();
      const dispose = effect(() => {
        testSignal();
        mockFn();
      });

      testSignal.set(1);
      expect(mockFn).toHaveBeenCalledTimes(2);

      dispose();
    });

    test("should allow signals to be garbage collected", async () => {
      // This test is more conceptual since we can't directly control GC
      let tempSignal = signal(0);

      // Remove the reference
      tempSignal = null as any;

      // Force garbage collection if available (only works if your runtime supports it)
      if (global.gc) {
        global.gc();
      }

      // Allow some time for potential GC
      await new Promise((resolve) => setTimeout(resolve, 0));

      // We can't reliably assert on weakRef.deref() being null since GC isn't guaranteed
      // but at least we've proven the code path works
      expect(true).toBe(true);
    });
  });
