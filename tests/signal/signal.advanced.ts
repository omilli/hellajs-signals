import { describe, test, expect, mock } from "bun:test";
import { effect, signal, type Signal } from "../../lib";
import { testCategories } from "../setup";

const obj = { name: "test", value: 42 };
const objUpdated = { name: "updated", value: 100 };
const arr = [1, 2, 3];
const arrUpdated = [4, 5, 6];

export const signalAdvanced = (count: Signal<number>) =>
  describe(testCategories.advanced, () => {
    test("should work with complex initial values", () => {
      const objSignal = signal(obj);
      const arrSignal = signal(arr);

      expect(objSignal()).toEqual(obj);
      expect(arrSignal()).toEqual(arr);

      objSignal.set(objUpdated);
      arrSignal.set(arrUpdated);

      expect(objSignal()).toEqual(objUpdated);
      expect(arrSignal()).toEqual(arrUpdated);
    });

    test("should handle signals created within effects", () => {
      const condition = signal(true);
      let dynamicSignal: Signal<number>;
      const effectMock = mock();

      effect(() => {
        dynamicSignal = condition() ? signal(123) : dynamicSignal;
      });

      expect(dynamicSignal!()).toBe(123);

      // Create a dependent effect to test the dynamically created signal
      effect(() => {
        if (dynamicSignal!) {
          dynamicSignal!();
          effectMock();
        }
      });

      expect(effectMock).toHaveBeenCalledTimes(1);
      dynamicSignal!.set(456);
      expect(effectMock).toHaveBeenCalledTimes(2);
    });

    test("should handle concurrent signal updates correctly", async () => {
      const updater = async () => {
        for (let i = 0; i < 100; i++) count.update((v) => v + 1);
      };
      await Promise.all([updater(), updater()]);
      expect(count()).toBe(200);
    });
  });
