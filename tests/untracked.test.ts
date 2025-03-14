import { describe, test, expect, mock } from "bun:test";
import {
  signal,
  effect,
  effectDependencies,
  getCurrentEffect,
  computed,
  untracked,
} from "../lib";

describe("untrack", () => {
  describe("basic", () => {
    test("should access signal without creating dependency", () => {
      const count = signal(0);
      const mockFn = mock();

      effect(() => {
        untracked(() => count()); // Access without creating dependency
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Update should not trigger effect
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should return value from untracked function", () => {
      const count = signal(42);
      const result = untracked(() => count());

      expect(result).toBe(42);
    });
  });

  describe("advanced", () => {
    test("should work with computed values", () => {
      const count = signal(0);
      const doubled = computed(() => count() * 2);
      const mockFn = mock();

      effect(() => {
        // Use untrack to prevent dependency on the computed
        untracked(() => doubled());
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update the underlying signal
      count.set(5);

      // The effect shouldn't re-run since we used untrack
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should handle nested untrack calls", () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);
      const mockFn = mock();

      effect(() => {
        // Track only signal c, untrack signals a and b
        untracked(() => {
          a();
          untracked(() => b());
        });
        c();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Updates to untracked signals shouldn't trigger effect
      a.set(10);
      b.set(20);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update to tracked signal should trigger effect
      c.set(30);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("memory management", () => {
    test("should clean up effect dependencies when disposed", () => {
      const a = signal(1);
      const b = signal(2);

      // Create and store the effect function
      let effectFn: EffectFn | null = null;
      const dispose = effect(() => {
        a();
        b();
        effectFn = getCurrentEffect();
      });

      // Verify dependencies are established
      expect(a._deps.size).toBe(1);
      expect(b._deps.size).toBe(1);
      expect(effectDependencies.get(effectFn!)?.size).toBe(2);

      // Dispose the effect
      dispose();

      // Verify all dependencies are cleaned up
      expect(a._deps.size).toBe(0);
      expect(b._deps.size).toBe(0);
      expect(effectDependencies.has(effectFn!)).toBe(false);
    });

    test("should handle complex dependency graph cleanup", () => {
      const a = signal(1);
      const b = signal(2);
      const c = computed(() => a() + b());
      const d = computed(() => c() * 2);

      const mockFn = mock();
      const dispose = effect(() => {
        d();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Dispose the top-level effect
      dispose();

      // Update signals - no re-computation should happen
      a.set(10);
      b.set(20);

      // Effect should not be called again
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should not leak memory when many signals are created and disposed", () => {
      // Create many signals and track the count in effectDependencies
      const initialMapSize = effectDependencies.size;

      // Create and then dispose 100 effects, each with its own signal
      for (let i = 0; i < 100; i++) {
        const s = signal(i);
        const dispose = effect(() => {
          s();
        });
        dispose();
      }

      // Map size should be unchanged after all disposals
      expect(effectDependencies.size).toBe(initialMapSize);
    });
  });
});

// Adding missing interface for the test
interface EffectFn {
  (): void;
}
