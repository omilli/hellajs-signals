import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";

export const signalNested = () =>
  describe("nested", () => {
    // Tests how effects track changes through multiple levels of signal dereferencing
    // outer()() - double function call syntax accesses nested signal value
    test("should track dependencies correctly with nested signals", () => {
      const inner = signal(0);
      const outer = signal(inner); // Signal that contains another signal
      const mockFn = mock();

      effect(() => {
        outer()(); // Access the inner signal's value through outer
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Effect should re-run when inner signal changes
      inner.set(1);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Effect should re-run when outer signal points to a new signal
      outer.set(signal(2));
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    // Tests object property path traversal through nested signals
    test("should handle nested signals", () => {
      const inner = signal({ count: 0 });
      const outer = signal({ inner }); // Object containing a signal property
      const effectMock = mock();

      effect(() => {
        outer().inner().count; // Access property through nested signal chain
        effectMock();
      });

      expect(effectMock).toHaveBeenCalledTimes(1);

      // Effect should re-run when the inner signal's content changes
      inner.set({ count: 1 });
      expect(effectMock).toHaveBeenCalledTimes(2);

      // Effect should re-run when the outer signal changes, even if referencing same inner
      outer.set({ inner });
      expect(effectMock).toHaveBeenCalledTimes(3);
    });
  });
