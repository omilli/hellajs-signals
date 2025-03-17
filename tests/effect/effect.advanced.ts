import { describe, test, expect, mock } from "bun:test";
import {
  effect,
  signal,
  type Signal,
  type EffectFn,
  getCurrentEffect,
} from "../../lib";
import { ctx, testCategories } from "../setup";

export const effectAdvanced = (count: Signal<number>) =>
  describe(testCategories.advanced, () => {
    test("should track bidirectional dependencies correctly", () => {
      let effectFn: EffectFn | null = null;

      // Create an effect and capture the effect function
      const dispose = effect(() => {
        count();
        effectFn = getCurrentEffect(ctx);
      });

      // Get dependencies for the effect
      const deps = ctx.effectDependencies.get(effectFn!);
      expect(deps).toBeDefined();
      expect(deps!.size).toBe(1);
      expect(deps!.has(count)).toBe(true);

      // Check that signal has the effect as a dependency
      const hasEffect = Array.from(count._deps).some(
        (weakRef) => weakRef.deref() === effectFn
      );
      expect(hasEffect).toBe(true);

      // Cleanup
      dispose();

      // Verify bidirectional cleanup
      const effectStillExists = Array.from(count._deps).some(
        (weakRef) => weakRef.deref() === effectFn
      );
      expect(effectStillExists).toBe(false);
      expect(ctx.effectDependencies.has(effectFn!)).toBe(false);
    });

    test("should handle effects that modify multiple signals", () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);

      // Effect that updates multiple signals
      effect(() => {
        const sum = a() + b();
        c.set(sum);
      });

      expect(c()).toBe(3); // 1 + 2 = 3

      a.set(10);
      expect(c()).toBe(12); // 10 + 2 = 12

      b.set(20);
      expect(c()).toBe(30); // 10 + 20 = 30
    });

    test("should properly handle effectDependencies during disposal", () => {
      const mockFn = mock();

      // Create and immediately dispose an effect
      const dispose = effect(() => {
        count();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      dispose();

      // Update the signal
      count.set(1);

      // Effect should not be triggered
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Make sure effectDependencies is cleaned up
      const remainingDeps = [...ctx.effectDependencies.entries()].filter(
        ([_, deps]) => deps.has(count)
      );
      expect(remainingDeps.length).toBe(0);
    });
  });
