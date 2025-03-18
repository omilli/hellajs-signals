import { describe, test, expect, mock } from "bun:test";
import { createContext } from "../../lib";

export const contextUtilities = () =>
  describe("utilities", () => {
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
