import { describe, test, expect, mock } from "bun:test";
import { effect, signal, type Signal } from "../../lib";
import { testCategories, warnSpy } from "../setup";

export const effectOptions = (count: Signal<number>) =>
  describe(testCategories.options, () => {
    test("should support the name option for debugging", () => {
      const dispose = effect(() => count(), { name: "counterEffect" });

      // @ts-ignore: Accessing internal property for testing
      expect((dispose as any)._name).toBe("counterEffect");

      dispose();
    });

    test("should support once option to run effect only once", () => {
      const mockFn = mock(() => {
        count(); // Create dependency
      });

      // Effect with once: true
      effect(mockFn, { once: true });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update should not trigger effect again
      count.set(5);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should support custom error handling", () => {
      const errorHandler = mock();
      const testError = new Error("Test error");

      const dispose = effect(
        () => {
          count(); // Create dependency
          throw testError;
        },
        {
          onError: errorHandler,
        }
      );

      expect(errorHandler).toHaveBeenCalledWith(testError);
      dispose();
    });

    test("should support priority option for execution order", () => {
      const result = signal("");

      // Create two effects with different priorities
      const disposeHigh = effect(
        () => {
          count(); // Create dependency
          result.update((val) => val + "high,");
        },
        { priority: 10 } // Higher runs first
      );

      const disposeLow = effect(
        () => {
          count(); // Create dependency
          result.update((val) => val + "low,");
        },
        { priority: 1 }
      );

      // Initial run order: high, then low
      expect(result()).toBe("high,low,");

      // Reset before testing update
      result.set("");

      // Update dependency to trigger both effects
      count.set(1);
      expect(result()).toBe("high,low,");

      disposeHigh();
      disposeLow();
    });

    test("should support cleanup registration via onCleanup option", () => {
      const cleanupFn = mock();

      const dispose = effect(() => count(), {
        onCleanup: cleanupFn,
      });

      dispose();
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });

    test("should detect and handle circular dependencies", () => {
      const spy = warnSpy();
      const a = signal(1);
      const b = signal(2);

      // Create circular dependency
      const dispose1 = effect(() => {
        a.set(b() + 1);
      });

      const dispose2 = effect(() => {
        b.set(a() + 1);
      });

      // Check warning was called
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toBe(
        "Circular dependency detected in effect"
      );

      spy.mockRestore();
      dispose1();
      dispose2();
    });
  });
