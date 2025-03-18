import { describe, test, expect } from "bun:test";
import { signal } from "../../lib";

// Test fixtures
const obj = { name: "test", value: 42 };
const objUpdated = { name: "updated", value: 100 };
const arr = [1, 2, 3];
const arrUpdated = [4, 5, 6];

export const signalBasic = () =>
  describe("basic", () => {
    // Basic primitive type tests
    test("should wotk with numbers", () => {
      const numSignal = signal(42);
      expect(numSignal()).toBe(42);
      numSignal.set(100);
      expect(numSignal()).toBe(100);
    });

    test("should work with strings", () => {
      const strSignal = signal("test");
      expect(strSignal()).toBe("test");
      strSignal.set("updated");
      expect(strSignal()).toBe("updated");
    });

    // Complex type tests
    test("should work with objects", () => {
      const objSignal = signal(obj);
      expect(objSignal()).toEqual(obj);
      objSignal.set(objUpdated);
      expect(objSignal()).toEqual(objUpdated);
    });

    test("should work with arrays", () => {
      const arrSignal = signal(arr);
      expect(arrSignal()).toEqual(arr);
      arrSignal.set(arrUpdated);
      expect(arrSignal()).toEqual(arrUpdated);
    });

    // Edge case: function as a signal value
    // Signal returns the function itself, not its execution result
    test("should work with functions", () => {
      const fn = () => "test";
      const fnSignal = signal(fn);
      expect(fnSignal()).toBe(fn);
      expect(fnSignal()()).toBe("test");
    });

    // Edge cases: nullable values
    test("should work with undefined/null", () => {
      const nullSignal = signal(null);
      const undefinedSignal = signal(undefined);
      expect(nullSignal()).toBeNull();
      expect(undefinedSignal()).toBeUndefined();
    });
  });
