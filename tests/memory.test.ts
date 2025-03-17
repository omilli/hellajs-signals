import { describe, test, expect, mock } from "bun:test";
import {
  signal,
  effect,
  getCurrentEffect,
  computed,
  type EffectFn,
  getCurrentContext,
} from "../lib";

const ctx = getCurrentContext();

describe("memory management", () => {
  test("should clean up effect dependencies when disposed", () => {
    const a = signal(1);
    const b = signal(2);

    // Create and store the effect function
    let effectFn: EffectFn | null = null;
    const dispose = effect(() => {
      a();
      b();
      effectFn = getCurrentEffect(ctx);
    });

    // Verify dependencies are established
    expect(a._deps.size).toBe(1);
    expect(b._deps.size).toBe(1);
    expect(ctx.effectDependencies.get(effectFn!)?.size).toBe(2);

    // Dispose the effect
    dispose();

    // Verify all dependencies are cleaned up
    expect(a._deps.size).toBe(0);
    expect(b._deps.size).toBe(0);
    expect(ctx.effectDependencies.has(effectFn!)).toBe(false);
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
    const initialMapSize = ctx.effectDependencies.size;

    // Create and then dispose 100 effects, each with its own signal
    for (let i = 0; i < 100; i++) {
      const s = signal(i);
      const dispose = effect(() => {
        s();
      });
      dispose();
    }

    // Map size should be unchanged after all disposals
    expect(ctx.effectDependencies.size).toBe(initialMapSize);
  });
});
