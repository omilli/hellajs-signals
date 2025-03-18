import { describe, test, expect, mock } from "bun:test";
import {
  effect,
  signal,
  type Signal,
  type EffectFn,
  getCurrentEffect,
} from "../../lib";
import { ctx } from "../setup";

export const effectAdvanced = (count: Signal<number>) =>
  describe("advanced", () => {
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

    test("should handle effects created inside other effects", () => {
      const outer = signal(0);
      const inner = signal(0);

      const outerMock = mock();
      const innerMock = mock();

      // Create an effect that conditionally creates another effect
      effect(() => {
        outerMock();
        outer();

        // Create a nested effect when outer value >= 5
        if (outer() >= 5) {
          effect(() => {
            inner();
            innerMock();
          });
        }
      });

      // Initial run
      expect(outerMock).toHaveBeenCalledTimes(1);
      expect(innerMock).toHaveBeenCalledTimes(0);

      // Update outer to 5, should create inner effect
      outer.set(5);
      expect(outerMock).toHaveBeenCalledTimes(2);
      expect(innerMock).toHaveBeenCalledTimes(1);

      // Update inner, should trigger inner effect but not outer
      inner.set(1);
      expect(outerMock).toHaveBeenCalledTimes(2);
      expect(innerMock).toHaveBeenCalledTimes(2);
    });

    test("should correctly clean up nested effects when parent effect disposes", () => {
      const condition = signal(true);
      const value = signal(0);
      const nestedMock = mock();

      // Keep track of the nested effect's disposal function
      let nestedDisposer: (() => void) | null = null;

      const dispose = effect(() => {
        // Only create the nested effect when condition is true
        if (condition()) {
          nestedDisposer = effect(() => {
            value();
            nestedMock();
          });
        }
      });

      // Initial setup - nested effect runs
      expect(nestedMock).toHaveBeenCalledTimes(1);

      // Update value to trigger nested effect
      value.set(1);
      expect(nestedMock).toHaveBeenCalledTimes(2);

      // Dispose parent effect
      dispose();

      // Update value again
      value.set(2);

      // Nested effect should not run again
      expect(nestedMock).toHaveBeenCalledTimes(2);
    });
  });
