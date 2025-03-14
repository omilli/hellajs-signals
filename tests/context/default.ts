import { describe, test, expect, mock } from "bun:test";
import { effect, getDefaultContext, signal } from "../../lib";

export const contextDefault = () =>
  describe("default context", () => {
    test("getDefaultContext should provide the same context across calls", () => {
      const defaultCtx1 = getDefaultContext();
      const defaultCtx2 = getDefaultContext();

      // Should be the same object
      expect(defaultCtx1).toBe(defaultCtx2);

      // Create a signal in the default context
      const count = defaultCtx1.signal(0);

      // Effect from second reference should see it
      const effectMock = mock();
      defaultCtx2.effect(() => {
        count();
        effectMock();
      });

      expect(effectMock).toHaveBeenCalledTimes(1);

      // Update should trigger effect
      count.set(1);
      expect(effectMock).toHaveBeenCalledTimes(2);
    });

    test("regular API should use default context", () => {
      // Create a signal with the regular API
      const regularSignal = signal(0);

      // Create a signal with the context API
      const defaultCtx = getDefaultContext();
      const contextSignal = defaultCtx.signal(0);

      // Create effects in different ways to track both
      const regularEffect = mock();
      const contextEffect = mock();

      // Regular API effect should track regular signal
      effect(() => {
        regularSignal();
        regularEffect();
      });

      // Context API effect should track context signal
      defaultCtx.effect(() => {
        contextSignal();
        contextEffect();
      });

      // Create a cross-effect that tracks both
      const crossEffect = mock();
      effect(() => {
        regularSignal();
        contextSignal();
        crossEffect();
      });

      // Initial run of all effects
      expect(regularEffect).toHaveBeenCalledTimes(1);
      expect(contextEffect).toHaveBeenCalledTimes(1);
      expect(crossEffect).toHaveBeenCalledTimes(1);

      // Update regular signal
      regularSignal.set(1);
      expect(regularEffect).toHaveBeenCalledTimes(2);
      expect(contextEffect).toHaveBeenCalledTimes(1); // Unchanged
      expect(crossEffect).toHaveBeenCalledTimes(2);

      // Update context signal
      contextSignal.set(1);
      expect(regularEffect).toHaveBeenCalledTimes(2); // Unchanged
      expect(contextEffect).toHaveBeenCalledTimes(2);
      expect(crossEffect).toHaveBeenCalledTimes(3);
    });
  });
