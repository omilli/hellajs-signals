import { describe, test, expect, mock } from "bun:test";
import { effect, signal, type Signal } from "../../lib";

export const signalAdvanced = () =>
  describe("advanced", () => {
    // Tests signals that contain other signals (higher-order signals)
    test("should allow signals of signals", () => {
      const inner = signal(0);
      const outer = signal(inner); // Signal containing a signal

      expect(outer()()).toBe(0); // Double deref to access inner signal value

      // Updating inner signal should be reflected when accessed through outer
      inner.set(1);
      expect(outer()()).toBe(1);

      // Changing outer to point to a different signal should work
      const newInner = signal(2);
      outer.set(newInner);
      expect(outer()()).toBe(2);
    });

    // Tests dynamic signal creation inside effects
    test("should handle signals created within effects", () => {
      const condition = signal(true);
      let dynamicSignal!: Signal<number>;
      const effectMock = mock();

      // Create signal conditionally based on another signal's value
      effect(() => {
        dynamicSignal = condition() ? signal(123) : dynamicSignal;
      });

      expect(dynamicSignal()).toBe(123);

      // Create a second effect that depends on dynamic signal
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

    // Tests that signal updates don't conflict in concurrent scenarios
    test("should handle concurrent signal updates correctly", async () => {
      const count = signal(0);
      // Create a function that performs multiple updates
      const updater = async () => {
        for (let i = 0; i < 100; i++) count.update((v) => v + 1);
      };
      // Run two updaters concurrently and await both
      await Promise.all([updater(), updater()]);
      expect(count()).toBe(200);
    });

    // Tests that effects don't re-run when value hasn't actually changed
    test("should not notify subscribers when value doesn't change", () => {
      const obj = { id: 1 };
      const objSignal = signal(obj);
      const mockFn = mock();

      effect(() => {
        objSignal();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Setting the same reference should not trigger updates
      objSignal.set(obj);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    // Tests signals with nested object structures
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

      // Immutably update a deeply nested property
      objSignal.set({
        ...complexObject,
        nested: { ...complexObject.nested, value: 100 },
      });

      expect(objSignal().nested.value).toBe(100);
    });

    // Tests edge case of circular references in signals
    test("should handle circular references", () => {
      interface CircularObj {
        name: string;
        self?: CircularObj;
      }

      // Create object that references itself
      const obj: CircularObj = { name: "circular" };
      obj.self = obj;

      const circularSignal = signal(obj);
      expect(circularSignal().name).toBe("circular");
      expect(circularSignal().self).toBe(circularSignal());

      // Replace with new circular object
      const newObj: CircularObj = { name: "updated" };
      newObj.self = newObj;

      circularSignal.set(newObj);
      expect(circularSignal().name).toBe("updated");
      expect(circularSignal().self).toBe(circularSignal());
    });
  });
