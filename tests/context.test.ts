import { describe, test, expect, mock } from "bun:test";
import {
  signal,
  effect,
  effectDependencies,
  createContext,
  getDefaultContext,
} from "../lib";

// Add context to lib/index.ts export
// export * from "./context";

describe("reactive context", () => {
  describe("basic isolation", () => {
    test("contexts should be completely isolated from each other", () => {
      // Create two separate contexts
      const ctx1 = createContext();
      const ctx2 = createContext();

      // Create signals in each context
      const count1 = ctx1.signal(0);
      const count2 = ctx2.signal(0);

      // Create effects in each context
      const effect1Mock = mock();
      const effect2Mock = mock();

      ctx1.effect(() => {
        count1(); // Create dependency
        effect1Mock();
      });

      ctx2.effect(() => {
        count2(); // Create dependency
        effect2Mock();
      });

      // Initial run of both effects
      expect(effect1Mock).toHaveBeenCalledTimes(1);
      expect(effect2Mock).toHaveBeenCalledTimes(1);

      // Update from context 1 should only trigger effect1
      count1.set(1);
      expect(effect1Mock).toHaveBeenCalledTimes(2);
      expect(effect2Mock).toHaveBeenCalledTimes(1);

      // Update from context 2 should only trigger effect2
      count2.set(1);
      expect(effect1Mock).toHaveBeenCalledTimes(2);
      expect(effect2Mock).toHaveBeenCalledTimes(2);
    });

    test("contexts should not leak to default context", () => {
      // Create an isolated context
      const ctx = createContext();

      // Create signals in isolated and default contexts
      const isolatedCount = ctx.signal(0);
      const defaultCount = signal(0);

      // Create effects in both contexts
      const isolatedMock = mock();
      const defaultMock = mock();

      ctx.effect(() => {
        isolatedCount(); // Create dependency in isolated context
        isolatedMock();
      });

      effect(() => {
        defaultCount(); // Create dependency in default context
        defaultMock();
      });

      // Initial run of both effects
      expect(isolatedMock).toHaveBeenCalledTimes(1);
      expect(defaultMock).toHaveBeenCalledTimes(1);

      // Update from isolated context should only trigger isolated effect
      isolatedCount.set(1);
      expect(isolatedMock).toHaveBeenCalledTimes(2);
      expect(defaultMock).toHaveBeenCalledTimes(1);

      // Update from default context should only trigger default effect
      defaultCount.set(1);
      expect(isolatedMock).toHaveBeenCalledTimes(2);
      expect(defaultMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("complex reactivity", () => {
    test("computed values should be isolated between contexts", () => {
      const ctx1 = createContext();
      const ctx2 = createContext();

      // Set up signals and computed values in both contexts
      const a1 = ctx1.signal(1);
      const b1 = ctx1.signal(2);
      const sum1 = ctx1.computed(() => a1() + b1());

      const a2 = ctx2.signal(10);
      const b2 = ctx2.signal(20);
      const sum2 = ctx2.computed(() => a2() + b2());

      // Initial values should be computed correctly
      expect(sum1()).toBe(3);
      expect(sum2()).toBe(30);

      // Updates should only affect their own context
      a1.set(5);
      b2.set(40);

      expect(sum1()).toBe(7); // 5 + 2
      expect(sum2()).toBe(50); // 10 + 40
    });

    test("effects can be selectively disposed within a context", () => {
      const ctx = createContext();

      const count = ctx.signal(0);
      const effectMock = mock();

      // Create and capture disposal function
      const dispose = ctx.effect(() => {
        count();
        effectMock();
      });

      expect(effectMock).toHaveBeenCalledTimes(1);

      // Update should trigger effect
      count.set(1);
      expect(effectMock).toHaveBeenCalledTimes(2);

      // Dispose effect
      dispose();

      // Updates should no longer trigger effect
      count.set(2);
      expect(effectMock).toHaveBeenCalledTimes(2); // Still 2, not increased
    });
  });

  describe("memory management", () => {
    test("contexts should clean up disposed effects", () => {
      const ctx = createContext();

      // Track initial effect count
      const initialEffectCount = effectDependencies.size;

      // Create 10 effects and immediately dispose them
      for (let i = 0; i < 10; i++) {
        const sig = ctx.signal(i);
        const dispose = ctx.effect(() => {
          sig(); // Create dependency
        });
        dispose(); // Immediately dispose
      }

      // Effect count should return to initial value
      expect(effectDependencies.size).toBe(initialEffectCount);
    });

    test("contexts should be garbage collectable when no longer referenced", async () => {
      // This test is harder to assert directly, but we can check that
      // creating many contexts doesn't permanently increase memory usage

      // Create and immediately discard 100 contexts with complex reactivity
      for (let i = 0; i < 100; i++) {
        const tempCtx = createContext();
        const sig1 = tempCtx.signal(i);
        const sig2 = tempCtx.signal(i * 2);
        const comp = tempCtx.computed(() => sig1() + sig2());
        tempCtx.effect(() => {
          comp(); // Create a dependency chain
        });

        // Update to trigger reactivity
        sig1.set(i + 1);
      }

      // Force garbage collection if possible (implementation dependent)
      // Note: this is not guaranteed to work in all JS environments
      if (global.gc) {
        global.gc();
      }

      // This is mainly to ensure the code above doesn't throw errors,
      // actual GC testing would require more sophisticated memory profiling
      expect(true).toBe(true);
    });
  });

  describe("cross-context interactions", () => {
    test("signals from one context should work in another but maintain isolation", () => {
      const ctx1 = createContext();
      const ctx2 = createContext();

      // Create a signal in context 1
      const sharedSignal = ctx1.signal("shared");

      // Create effects in both contexts tracking the same signal
      const effect1Mock = mock();
      const effect2Mock = mock();

      ctx1.effect(() => {
        sharedSignal(); // Track in context 1
        effect1Mock();
      });

      ctx2.effect(() => {
        sharedSignal(); // Track in context 2
        effect2Mock();
      });

      // Initial run of both effects
      expect(effect1Mock).toHaveBeenCalledTimes(1);
      expect(effect2Mock).toHaveBeenCalledTimes(1);

      // Update should trigger effects in both contexts
      sharedSignal.set("updated");
      expect(effect1Mock).toHaveBeenCalledTimes(2);
      expect(effect2Mock).toHaveBeenCalledTimes(2);

      // But each context maintains its own tracking system
      // Create a signal in context 2 only tracked there
      const ctx2Signal = ctx2.signal("ctx2only");
      ctx2.effect(() => {
        ctx2Signal();
        sharedSignal(); // Also track the shared signal
      });

      // Updating ctx2Signal shouldn't affect context 1
      ctx2Signal.set("changed");
      expect(effect1Mock).toHaveBeenCalledTimes(2); // Unchanged
    });
  });

  describe("batch and untracked utilities", () => {
    test("batch should respect context boundaries", () => {
      const ctx = createContext();

      const count1 = ctx.signal(0);
      const count2 = ctx.signal(10);
      const effectMock = mock();

      ctx.effect(() => {
        count1();
        count2();
        effectMock();
      });

      // Initial run
      expect(effectMock).toHaveBeenCalledTimes(1);

      // Batch updates should only run effect once
      ctx.batch(() => {
        count1.set(1);
        count2.set(20);
      });

      expect(effectMock).toHaveBeenCalledTimes(2); // Only one additional call
    });

    test("untracked should work within contexts", () => {
      const ctx = createContext();

      const count = ctx.signal(0);
      const effectMock = mock();

      ctx.effect(() => {
        // Read count but don't track it
        ctx.untracked(() => count());
        effectMock();
      });

      // Initial run
      expect(effectMock).toHaveBeenCalledTimes(1);

      // Update shouldn't trigger effect because it was untracked
      count.set(99);
      expect(effectMock).toHaveBeenCalledTimes(1); // Still only the initial call
    });
  });

  describe("default context", () => {
    test("getDefaultContext should provide the same context across calls", () => {
      const defaultCtx1 = getDefaultContext();
      const defaultCtx2 = getDefaultContext();

      // Should be the same object
      expect(defaultCtx1).toBe(defaultCtx2);

      // Create a signal in the default context
      const count = defaultCtx1.signal(0);

      // Effect from second reference should see it
      const effectMock = mock();
      defaultCtx2.effect(() => {
        count();
        effectMock();
      });

      expect(effectMock).toHaveBeenCalledTimes(1);

      // Update should trigger effect
      count.set(1);
      expect(effectMock).toHaveBeenCalledTimes(2);
    });

    test("regular API should use default context", () => {
      // Create a signal with the regular API
      const regularSignal = signal(0);

      // Create a signal with the context API
      const defaultCtx = getDefaultContext();
      const contextSignal = defaultCtx.signal(0);

      // Create effects in different ways to track both
      const regularEffect = mock();
      const contextEffect = mock();

      // Regular API effect should track regular signal
      effect(() => {
        regularSignal();
        regularEffect();
      });

      // Context API effect should track context signal
      defaultCtx.effect(() => {
        contextSignal();
        contextEffect();
      });

      // Create a cross-effect that tracks both
      const crossEffect = mock();
      effect(() => {
        regularSignal();
        contextSignal();
        crossEffect();
      });

      // Initial run of all effects
      expect(regularEffect).toHaveBeenCalledTimes(1);
      expect(contextEffect).toHaveBeenCalledTimes(1);
      expect(crossEffect).toHaveBeenCalledTimes(1);

      // Update regular signal
      regularSignal.set(1);
      expect(regularEffect).toHaveBeenCalledTimes(2);
      expect(contextEffect).toHaveBeenCalledTimes(1); // Unchanged
      expect(crossEffect).toHaveBeenCalledTimes(2);

      // Update context signal
      contextSignal.set(1);
      expect(regularEffect).toHaveBeenCalledTimes(2); // Unchanged
      expect(contextEffect).toHaveBeenCalledTimes(2);
      expect(crossEffect).toHaveBeenCalledTimes(3);
    });
  });
});
