import { describe, test, expect, mock } from "bun:test";
import { effect, signal, type Signal } from "../../lib";

export const effectBasic = (count: Signal<number>) => {
  const effectFn = () => {
    count(); // Create dependency
  };

  return describe("basic", () => {
    test("should run effect immediately", () => {
      const mockFn = mock();
      const dispose = effect(mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
      dispose();
    });

    test("should run effect when dependencies change", () => {
      const mockFn = mock(effectFn);

      const dispose = effect(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Update dependency
      expect(mockFn).toHaveBeenCalledTimes(2);

      dispose();
    });

    test("should stop tracking changes when disposed", () => {
      const mockFn = mock(effectFn);

      const dispose = effect(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);

      dispose(); // Cleanup

      count.set(5); // Update should not trigger effect
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should track multiple signal dependencies", () => {
      const a = signal(1);
      const b = signal(2);
      const mockFn = mock(() => {
        a(); // Create dependency on a
        b(); // Create dependency on b
      });

      const dispose = effect(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);

      a.set(10); // Update first dependency
      expect(mockFn).toHaveBeenCalledTimes(2);

      b.set(20); // Update second dependency
      expect(mockFn).toHaveBeenCalledTimes(3);

      dispose();
    });
  });
};
