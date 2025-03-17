import { describe, test, expect, mock, spyOn } from "bun:test";
import {
  effect,
  getCurrentContext,
  getCurrentEffect,
  signal,
  type EffectFn,
} from "../lib";

const ctx = getCurrentContext();

describe("effect", () => {
  describe("basic", () => {
    test("should run effect immediately", () => {
      const mockFn = mock();
      effect(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should run effect when dependencies change", () => {
      const count = signal(0);
      const mockFn = mock(() => {
        count(); // Create dependency
      });

      effect(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Update dependency
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("should handle cleanup when disposed", () => {
      const count = signal(0);
      const mockFn = mock(() => count());

      const dispose = effect(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);

      dispose(); // Cleanup

      count.set(1); // Update should not trigger effect
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should handle errors in effect", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      // Use try/catch around the effect to prevent test from failing
      try {
        effect(() => {
          throw new Error("Test error");
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toBe("Error in effect:");
      consoleSpy.mockRestore();
    });

    test("should detect circular dependencies", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});
      const a = signal(1);
      const b = signal(2);

      effect(() => {
        a.set(b() + 1);
      });

      effect(() => {
        b.set(a() + 1);
      });

      // Check that warning was called, now with object argument instead of just a string
      expect(consoleSpy).toHaveBeenCalled();

      // Verify the first parameter is the warning message
      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toBe("Circular dependency detected in effect");

      // Verify the second parameter has the expected context information
      expect(callArgs[1]).toHaveProperty("effectId");
      expect(callArgs[1]).toHaveProperty("runningEffectsSize");

      consoleSpy.mockRestore();
    });
  });

  describe("advanced", () => {
    test("should track bidirectional dependencies correctly", () => {
      const count = signal(0);
      let effectFn: EffectFn | null = null;

      // Create an effect and capture the effect function
      const dispose = effect(() => {
        count();
        effectFn = getCurrentEffect();
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
      const count = signal(0);
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

  describe("options", () => {
    // Add to the existing tests

    test("should support name option", () => {
      const namedEffect = effect(() => {}, { name: "testEffect" });
      // Access internal property to verify name was set
      expect((namedEffect as any)._name).toBe("testEffect");
    });

    test("should support custom error handling", () => {
      const errorHandler = mock();
      const testError = new Error("Test error");

      effect(
        () => {
          throw testError;
        },
        {
          onError: errorHandler,
        }
      );

      expect(errorHandler).toHaveBeenCalledWith(testError);
    });

    test("should support once option", () => {
      const count = signal(0);
      const mockFn = mock();

      effect(
        () => {
          count();
          mockFn();
        },
        { once: true }
      );

      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Should not trigger the effect again
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should call onCleanup when effect is disposed", () => {
      const cleanupFn = mock();

      const dispose = effect(() => {}, {
        onCleanup: cleanupFn,
      });

      dispose();
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });
});
