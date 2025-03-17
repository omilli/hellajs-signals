import { describe, test, expect, mock } from "bun:test";
import { signal, type Signal } from "../../lib";
import { testCategories, warnSpy, errorSpy } from "../setup";

export const signalOptions = (count: Signal<number>) =>
  describe(testCategories.options, () => {
    test("should support name option for debugging", () => {
      // @ts-ignore: Accessing internal property for testing
      expect(count._name).toBe("count");
    });

    test("should apply validators and prevent invalid updates", () => {
      const spy = warnSpy();
      // Only allow even numbers
      const evenOnly = signal(0, {
        name: "evenOnly",
        validators: [(value) => value % 2 === 0],
      });

      // Valid update
      evenOnly.set(2);
      expect(evenOnly()).toBe(2);

      // Invalid update
      evenOnly.set(3);
      expect(evenOnly()).toBe(2); // Value shouldn't change

      // Verify warning was logged
      expect(spy).toHaveBeenCalledWith(
        'Validation failed for signal "evenOnly"',
        3
      );

      spy.mockRestore();
    });

    test("should call onSet hook when value changes", () => {
      const onSet = mock();
      const count = signal(0, { onSet });

      count.set(5);

      expect(onSet).toHaveBeenCalledWith(5, 0);
    });

    test("should handle errors in onSet hook", () => {
      const spy = errorSpy();
      const count = signal(0, {
        name: "errorHook",
        onSet: () => {
          throw new Error("Hook error");
        },
      });

      // Should not throw despite error in hook
      expect(() => count.set(5)).not.toThrow();
      expect(count()).toBe(5); // Value should still update

      // Error should be logged
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toContain(
        'Error in onSet hook for signal "errorHook"'
      );

      spy.mockRestore();
    });

    test("should support multiple validators", () => {
      // Must be positive and even
      const count = signal(2, {
        name: "validate",
        validators: [(value) => value > 0, (value) => value % 2 === 0],
      });

      // Valid (positive and even)
      count.set(4);
      expect(count()).toBe(4);

      // Invalid (not even)
      count.set(3);
      expect(count()).toBe(4);

      // Invalid (not positive)
      count.set(-2);
      expect(count()).toBe(4);
    });

    test("should use update method with validators", () => {
      // Only allow even numbers
      const evenOnly = signal(0, {
        name: "validateUpdate",
        validators: [(value) => value % 2 === 0],
      });

      // Valid update
      evenOnly.update((v) => v + 2);
      expect(evenOnly()).toBe(2);

      // Invalid update
      evenOnly.update((v) => v + 1);
      expect(evenOnly()).toBe(2); // Should remain unchanged
    });
  });
