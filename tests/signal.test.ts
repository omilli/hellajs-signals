import { describe, test, expect, mock } from "bun:test";
import { signal, effect } from "../lib";

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

    test("should not update if value is equal", () => {
      const count = signal(0);
      const mockFn = mock();
      effect(() => {
        count();
        mockFn();
      });

      // First call happens immediately when effect is created
      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(0); // Same value, should not trigger effect
      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Different value, should trigger effect
      expect(mockFn).toHaveBeenCalledTimes(2);
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

    test("should handle object reference equality correctly", () => {
      const obj = { value: 42 };
      const objSignal = signal(obj);

      const mockFn = mock();
      effect(() => {
        objSignal();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Setting same reference shouldn't trigger effect
      objSignal.set(obj);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // New object with same content should trigger (reference changed)
      objSignal.set({ value: 42 });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("should handle signals created within effects", () => {
      const condition = signal(true);
      let dynamicSignal: any = null;

      effect(() => {
        if (condition()) {
          dynamicSignal = signal(123);
        }
      });

      expect(dynamicSignal()).toBe(123);

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
      dynamicSignal.set(456);
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
});
