import { describe, test, expect, mock } from "bun:test";
import { effect, signal, type Signal } from "../../lib";

export const signalAdvanced = () =>
  describe("advanced", () => {
    test("should allow signals of signals", () => {
      const inner = signal(0);
      const outer = signal(inner);

      expect(outer()()).toBe(0);

      inner.set(1);
      expect(outer()()).toBe(1);

      const newInner = signal(2);
      outer.set(newInner);
      expect(outer()()).toBe(2);
    });

    test("should handle signals created within effects", () => {
      const condition = signal(true);
      let dynamicSignal!: Signal<number>;
      const effectMock = mock();

      effect(() => {
        dynamicSignal = condition() ? signal(123) : dynamicSignal;
      });

      expect(dynamicSignal()).toBe(123);

      // Create a dependent effect to test the dynamically created signal
      effect(() => {
        if (dynamicSignal) {
          dynamicSignal();
          effectMock();
        }
      });

      expect(effectMock).toHaveBeenCalledTimes(1);
      dynamicSignal.set(456);
      expect(effectMock).toHaveBeenCalledTimes(2);
    });

    test("should handle concurrent signal updates correctly", async () => {
      const count = signal(0);
      const updater = async () => {
        for (let i = 0; i < 100; i++) count.update((v) => v + 1);
      };
      await Promise.all([updater(), updater()]);
      expect(count()).toBe(200);
    });

    test("should not notify subscribers when value doesn't change", () => {
      const obj = { id: 1 };
      const objSignal = signal(obj);
      const mockFn = mock();

      effect(() => {
        objSignal();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Set to the same object reference
      objSignal.set(obj);

      // Effect should not be triggered again
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("should track dependencies correctly with nested signals", () => {
      const inner = signal(0);
      const outer = signal(inner);
      const mockFn = mock();

      effect(() => {
        // Access the inner signal through the outer signal
        outer()();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update inner signal should trigger effect
      inner.set(1);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Update outer signal to a new signal should trigger effect
      outer.set(signal(2));
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    test("should handle complex objects", () => {
      const complexObject = {
        id: 1,
        name: "test",
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      };
      const objSignal = signal(complexObject);

      expect(objSignal().nested.value).toBe(42);

      objSignal.set({
        ...complexObject,
        nested: { ...complexObject.nested, value: 100 },
      });

      expect(objSignal().nested.value).toBe(100);
    });

    test("should handle nested signals", () => {
      const inner = signal({ count: 0 });
      const outer = signal({ inner });
      const effectMock = mock();

      effect(() => {
        // Access deeply nested signal value
        outer().inner().count;
        effectMock();
      });

      expect(effectMock).toHaveBeenCalledTimes(1);

      // Update the nested value
      inner.set({ count: 1 });
      expect(effectMock).toHaveBeenCalledTimes(2);

      // Update the outer object with the same inner reference
      outer.set({ inner });
      expect(effectMock).toHaveBeenCalledTimes(3);
    });

    test("should handle circular references", () => {
      interface CircularObj {
        name: string;
        self?: CircularObj;
      }

      const obj: CircularObj = { name: "circular" };
      obj.self = obj; // Create circular reference

      const circularSignal = signal(obj);
      expect(circularSignal().name).toBe("circular");
      expect(circularSignal().self).toBe(circularSignal());

      // Update with new circular object
      const newObj: CircularObj = { name: "updated" };
      newObj.self = newObj;

      circularSignal.set(newObj);
      expect(circularSignal().name).toBe("updated");
      expect(circularSignal().self).toBe(circularSignal());
    });
  });
