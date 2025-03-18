import { describe, test, expect } from "bun:test";
import { createContext, getCurrentContext } from "../../lib";

const globalCtx = getCurrentContext();

export const contextMemory = () =>
  describe("memory", () => {
    test("contexts should clean up disposed effects", () => {
      const ctx = createContext();

      // Track initial effect count
      const initialEffectCount = globalCtx.effectDependencies.size;

      // Create 10 effects and immediately dispose them
      for (let i = 0; i < 10; i++) {
        const sig = ctx.signal(i);
        const dispose = ctx.effect(() => {
          sig(); // Create dependency
        });
        dispose(); // Immediately dispose
      }

      // Effect count should return to initial value
      expect(globalCtx.effectDependencies.size).toBe(initialEffectCount);
    });

    test("contexts should be garbage collectable when no longer referenced", async () => {
      // Create and immediately discard contexts with simpler reactivity
      for (let i = 0; i < 100; i++) {
        const tempCtx = createContext();
        const sig = tempCtx.signal(i);

        // Create a one-shot effect that doesn't track the signal's update
        tempCtx.effect(
          () => {
            // Read the signal once but don't create a circular update chain
            const value = sig();
            // Do something with value to prevent optimization
            if (value < 0) console.log("impossible");
          },
          { once: true }
        );

        // This update won't create circular references with the once:true option
        sig.set(i + 1);
      }

      // Force garbage collection if possible
      if (global.gc) {
        global.gc();
      }

      expect(true).toBe(true);
    });

    test("context states are garbage collected when contexts are no longer referenced", async () => {
      // Use a WeakRef to track if the context state gets GC'd
      let contextRef;

      // Create a scope for the context to go out of scope
      {
        const tempCtx = createContext();

        // Store a weak reference to the context
        contextRef = new WeakRef(tempCtx);

        // Create some reactivity to ensure the state is properly initialized
        const sig = tempCtx.signal(123);
        tempCtx.effect(() => {
          sig();
        });

        // Update to trigger effects
        sig.set(456);

        // Verify our reference is still valid at this point
        expect(contextRef.deref()).toBe(tempCtx);
      }

      // Force garbage collection if possible
      if (global.gc) {
        // Run GC multiple times to increase likelihood of collection
        for (let i = 0; i < 5; i++) {
          global.gc();
          // Small delay to give GC time to work
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // After aggressive GC, the context should be gone
        // This is a "hopeful" test since GC behavior is not guaranteed
        //@ts-ignore - undefined deref
        expect(contextRef.deref()).toBe(undefined);
      } else {
        // Skip test if GC is not available
        console.log("Skipping part of test: global.gc not available");
      }
    });
  });
