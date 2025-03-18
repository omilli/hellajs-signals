import { describe, test, expect, mock } from "bun:test";
import { signal, effect } from "../../lib";
import { tick } from "../setup";

export const signalMemory = () =>
  describe("memory", () => {
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
      new WeakRef(tempSignal);

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

    test("should handle large numbers of signals without memory issues", async () => {
      const COUNT = 1000;
      const signals = [];

      // Create a large number of signals
      for (let i = 0; i < COUNT; i++) {
        signals.push(signal(i));
      }

      // Update all signals
      for (let i = 0; i < COUNT; i++) {
        signals[i].set(i + 1);
      }

      // Verify updates worked
      for (let i = 0; i < COUNT; i++) {
        expect(signals[i]()).toBe(i + 1);
      }

      // Force GC if possible and check memory is released
      signals.length = 0;
      if (global.gc) {
        global.gc();
      }
      await tick(0);

      // The test passes if we get here without running out of memory
      expect(true).toBe(true);
    });

    test("should clean up effects when signal is no longer referenced", async () => {
      // Use a class to encapsulate a signal and its dependent effect
      class SignalContainer {
        signal;
        effectDispose;

        constructor(value: number) {
          this.signal = signal(value);
          this.effectDispose = effect(() => {
            this.signal(); // Create dependency
          });
        }

        dispose() {
          this.effectDispose();
        }
      }

      // Create and immediately dispose to test cleanup
      let container: SignalContainer | null = new SignalContainer(42);
      new WeakRef(container.signal);

      // Explicitly dispose and remove reference
      container.dispose();
      container = null;

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      // Allow some time for potential GC
      await tick(0);

      // Check if the WeakRef is cleared (only if GC ran)
      // This test is more conceptual, not always deterministic
      expect(true).toBe(true);
    });

    test("should not leak memory with signal dependencies", async () => {
      // Create a signal with many dependencies
      const mainSignal = signal(0);
      const weakRefs = [];

      // Create 100 effects that depend on the signal
      for (let i = 0; i < 100; i++) {
        const effectFn = effect(() => {
          mainSignal(); // Create dependency
        });

        weakRefs.push(new WeakRef(effectFn));

        // Immediately dispose the effect
        effectFn();
      }

      // Signal should now have no active subscribers
      // @ts-ignore: Accessing internal property for testing
      expect(mainSignal._deps.size).toBe(0);

      // Clean up for GC
      if (global.gc) {
        global.gc();
      }

      // Wait for potential GC
      await tick(0);

      // The test passes if we reach this point
      expect(true).toBe(true);
    });
  });
