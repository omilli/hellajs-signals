import { describe, test, expect, mock } from "bun:test";
import { effect, untracked, type Signal } from "../../lib";

export const untrackedBasic = (count: Signal<number>) =>
  describe("basic", () => {
    test("should access signal without creating dependency", () => {
      const mockFn = mock();

      effect(() => {
        untracked(() => count()); // Access without creating dependency
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Update should not trigger effect
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should return value from untracked function", () => {
      count.set(42);
      const result = untracked(() => count());
      expect(result).toBe(42);
    });
  });
