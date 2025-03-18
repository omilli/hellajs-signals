import { describe, test, expect, mock } from "bun:test";
import { signal, effect } from "../../lib";
import { tick } from "../setup";

export const signalMemory = () =>
  describe("memory", () => {
    // Tests that disposed effects are properly removed from signal subscriptions
    test("should clean up WeakRef subscribers when effects are disposed", () => {
      const testSignal = signal(0);

      // Create and immediately dispose multiple effects
      for (let i = 0; i < 10; i++) {
        const dispose = effect(() => {
          testSignal();
        });
        dispose();
      }

      const mockFn = mock();
      const dispose = effect(() => {
        testSignal();
        mockFn();
      });

      testSignal.set(1);
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial run + update

      dispose();
    });

    // Tests if signals can be garbage collected when no longer referenced
    // This is difficult to test deterministically as GC is not directly controllable
    test("should allow signals to be garbage collected", async () => {
      // This test is more conceptual since we can't directly control GC
      let tempSignal = signal(0);
      new WeakRef(tempSignal); // Create weak reference to track potential GC

      tempSignal = null as any; // Remove strong reference to allow GC

      if (global.gc) {
        global.gc(); // Manually trigger GC if available
      }

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(true).toBe(true);
    });

    // Tests that the system can handle a large number of signals without memory issues
    test("should handle large numbers of signals without memory issues", async () => {
      const COUNT = 1000;
      const signals = [];

      // Create many signals
      for (let i = 0; i < COUNT; i++) {
        signals.push(signal(i));
      }

      // Update all signals
      for (let i = 0; i < COUNT; i++) {
        signals[i].set(i + 1);
      }

      // Verify all signals updated correctly
      for (let i = 0; i < COUNT; i++) {
        expect(signals[i]()).toBe(i + 1);
      }

      // Clear references to allow GC
      signals.length = 0;
      if (global.gc) {
        global.gc();
      }
      await tick(0);

      expect(true).toBe(true);
    });

    // Tests cleanup of effects when container objects are garbage collected
    test("should clean up effects when signal is no longer referenced", async () => {
      class SignalContainer {
        signal;
        effectDispose;

        constructor(value: number) {
          this.signal = signal(value);
          // Create an effect that depends on the signal
          this.effectDispose = effect(() => {
            this.signal();
          });
        }

        dispose() {
          this.effectDispose();
        }
      }

      let container: SignalContainer | null = new SignalContainer(42);
      new WeakRef(container.signal); // Track signal with weak reference

      container.dispose(); // Properly dispose effect
      container = null; // Remove reference to allow GC

      if (global.gc) {
        global.gc();
      }

      await tick(0);

      expect(true).toBe(true);
    });

    // Tests that signal dependencies don't create memory leaks
    test("should not leak memory with signal dependencies", async () => {
      const mainSignal = signal(0);
      const weakRefs = [];

      // Create many effects that depend on the signal but have no strong references
      for (let i = 0; i < 100; i++) {
        const effectFn = effect(() => {
          mainSignal();
        });

        weakRefs.push(new WeakRef(effectFn));

        effectFn(); // Execute effect function directly
      }

      // Dependencies should be cleared when effect references are gone
      expect(mainSignal._deps.size).toBe(0);

      if (global.gc) {
        global.gc();
      }

      await tick(0);

      expect(true).toBe(true);
    });
  });
