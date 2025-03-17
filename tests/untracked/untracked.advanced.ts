import { describe, test, expect, mock } from "bun:test";
import { signal, effect, computed, untracked, type Signal } from "../../lib";
import { testCategories } from "../setup";

export const untrackedAdvanced = (count: Signal<number>) =>
  describe(testCategories.advanced, () => {
    test("should work with computed values", () => {
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
