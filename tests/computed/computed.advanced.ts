import { describe, test, expect, mock } from "bun:test";
import { signal, computed, type SignalValue, type Signal } from "../../lib";

export const computedAdvanced = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe("advanced", () => {
    test("should handle multiple signal dependencies", () => {
      // Tests that computed signals correctly track and respond to multiple dependencies
      const add = signal(5);
      const sum = computed(() => count() + add());

      // Initial computation with both dependencies
      expect(sum()).toBe(6);

      // Update first dependency
      count.set(7);
      expect(sum()).toBe(12); // 7 + 5 = 12

      // Update second dependency
      add.set(20);
      expect(sum()).toBe(27); // 7 + 20 = 27
    });

    test("should handle nested computed values", () => {
      // Tests that computed signals can depend on other computed signals,
      // forming a dependency chain that properly updates
      const quadrupled = computed(() => doubled() * 2);

      // Verify initial computation works through the chain
      expect(doubled()).toBe(2);
      expect(quadrupled()).toBe(4);

      // Verify changes propagate through multiple computed layers
      count.set(2);
      expect(doubled()).toBe(4);
      expect(quadrupled()).toBe(8);
    });

    test("should dispose computed values correctly", () => {
      // Tests that disposed computed signals stop tracking their dependencies
      // and no longer update when dependencies change
      const testSignal = signal(0);

      // Create a computed that depends on both signals
      const computeFn = () => count() * 2 + testSignal();
      const doubled = computed(computeFn);

      // Initial computation
      expect(doubled()).toBe(2);

      // Dispose the computed value
      (doubled as SignalValue<number>)._cleanup();

      // Updates to dependencies should no longer affect the computed value
      count.set(2);
      testSignal.set(1);

      // Disposed computed should either return stale value or throw
      try {
        const result = doubled();
        // If it returns, it should not be the updated value
        expect(result).not.toBe(5); // 2*2+1 = 5 would be the updated value
      } catch (e) {
        // Throwing is also acceptable behavior for disposed values
        expect(e).toBeDefined();
      }
    });

    test("should ensure side effects in computation functions are properly handled", () => {
      // Tests that side effects in computed functions are executed predictably
      // Side effects should only run when the computation actually happens
      const a = signal(1);
      const mockSideEffect = mock(() => {});
      const myComputed = computed(() => {
        mockSideEffect();
        return a() * 2;
      });

      expect(mockSideEffect).toHaveBeenCalledTimes(1);
      expect(myComputed()).toBe(2);
      expect(mockSideEffect).toHaveBeenCalledTimes(2);

      a.set(2);
      expect(myComputed()).toBe(4);
      expect(mockSideEffect).toHaveBeenCalledTimes(4);
    });

    test("should handle dependencies that change conditionally", () => {
      // Tests that computed signals correctly handle conditional dependency tracking
      // Dependencies should be dynamically tracked based on execution paths
      const condition = signal(true);
      const a = signal(1);
      const b = signal(2);

      const myComputed = computed(() => {
        return condition() ? a() : b();
      });

      expect(myComputed()).toBe(1);

      condition.set(false);
      expect(myComputed()).toBe(2);

      a.set(5);
      expect(myComputed()).toBe(2);

      b.set(10);
      expect(myComputed()).toBe(10);
    });
  });
