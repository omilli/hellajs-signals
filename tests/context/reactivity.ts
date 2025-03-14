import { describe, test, expect, mock } from "bun:test";
import { createContext } from "../../lib";

export const contextReactivity = () =>
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
