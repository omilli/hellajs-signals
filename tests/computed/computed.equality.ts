import { describe, test, expect } from "bun:test";
import { signal, computed } from "../../lib";

export const computedEquality = () =>
  describe("equality", () => {
    test("should not recompute if the value is the same", () => {
      const a = signal(1);
      const computeFn = () => a() % 2;
      const myComputed = computed(computeFn);

      expect(myComputed()).toBe(1);
      a.set(3);
      expect(myComputed()).toBe(1);
    });

    test("should recompute if the value is different", () => {
      const a = signal(1);
      const computeFn = () => a() % 2;
      const myComputed = computed(computeFn);

      expect(myComputed()).toBe(1);
      a.set(2);
      expect(myComputed()).toBe(0);
    });

    test("should handle object/array return values and reference vs value equality", () => {
      const a = signal([1, 2, 3]);
      const computeFn = () => [...a()];
      const myComputed = computed(computeFn);

      const initialValue = myComputed();
      expect(initialValue).toEqual([1, 2, 3]);

      a.set([1, 2, 3]);
      expect(myComputed()).toEqual(initialValue); // Should return the same reference

      a.set([3, 2, 1]);
      expect(myComputed()).not.toBe(initialValue); // Should return a new reference
      expect(myComputed()).toEqual([3, 2, 1]); // Should return a new reference
    });
  });
