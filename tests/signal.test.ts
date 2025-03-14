import { describe, test, expect, mock, spyOn } from "bun:test";
import { signal, effect, type Signal } from "../lib";

describe("signal", () => {
  describe("basic", () => {
    test("should create a signal with initial value", () => {
      const count = signal(0);
      expect(count()).toBe(0);
    });

    test("should update signal value", () => {
      const count = signal(0);
      count.set(5);
      expect(count()).toBe(5);
    });
  });

  describe("advanced", () => {
    test("should work with complex initial values", () => {
      const objSignal = signal({ name: "test", value: 42 });
      const arrSignal = signal([1, 2, 3]);

      expect(objSignal()).toEqual({ name: "test", value: 42 });
      expect(arrSignal()).toEqual([1, 2, 3]);

      objSignal.set({ name: "updated", value: 100 });
      arrSignal.set([4, 5, 6]);

      expect(objSignal()).toEqual({ name: "updated", value: 100 });
      expect(arrSignal()).toEqual([4, 5, 6]);
    });

    test("should handle signals created within effects", () => {
      const condition = signal(true);
      let dynamicSignal: Signal<number> | null = null;

      effect(() => {
        if (condition()) {
          dynamicSignal = signal(123);
        }
      });

      if (typeof dynamicSignal === "function") {
        expect((dynamicSignal as Signal<number>)()).toBe(123);
      }

      // Create a dependent effect to test the dynamically created signal
      const mockFn = mock();
      effect(() => {
        if (dynamicSignal) {
          dynamicSignal();
          mockFn();
        }
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update dynamic signal should trigger effect
      if (typeof dynamicSignal === "function") {
        (dynamicSignal as Signal<number>).set(456);
      }

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("should handle concurrent signal updates correctly", async () => {
      const count = signal(0);
      await Promise.all([
        (async () => {
          for (let i = 0; i < 100; i++) count.update((v) => v + 1);
        })(),
        (async () => {
          for (let i = 0; i < 100; i++) count.update((v) => v + 1);
        })(),
      ]);
      expect(count()).toBe(200);
    });
  });

  // Add to the existing signal test suite

  describe("options", () => {
    test("should support name option for debugging", () => {
      const count = signal(0, { name: "count" });
      // @ts-ignore: Accessing internal property for testing
      expect(count._name).toBe("count");
    });

    test("should apply validators and prevent invalid updates", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});

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
      expect(consoleSpy).toHaveBeenCalledWith(
        'Validation failed for signal "evenOnly"',
        3
      );

      consoleSpy.mockRestore();
    });

    test("should call onSet hook when value changes", () => {
      const onSetMock = mock();
      const count = signal(0, {
        onSet: onSetMock,
      });

      count.set(5);

      expect(onSetMock).toHaveBeenCalledWith(5, 0);
    });

    test("should handle errors in onSet hook", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

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
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain(
        'Error in onSet hook for signal "errorHook"'
      );

      consoleSpy.mockRestore();
    });

    test("should support multiple validators", () => {
      // Must be positive and even
      const count = signal(2, {
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
});
