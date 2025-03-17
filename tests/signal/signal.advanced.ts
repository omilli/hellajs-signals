import { describe, test, expect } from "bun:test";
import { effect, signal, type Signal } from "../../lib";
import { testCategories, mockFn } from "../setup";

export const signalAdvanced = (count: Signal<number>) =>
  describe(testCategories.advanced, () => {
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
