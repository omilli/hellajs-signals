import { describe, test, expect } from "bun:test";
import { signal, computed } from "../../lib";

export const computedAsync = () =>
  describe("async", () => {
    test("should handle computed functions that return Promises", async () => {
      // This test checks if the computed signal can handle computed functions that return Promises.
      const a = signal(1);
      const myComputed = computed(async () => {
        return (await a()) * 2;
      });

      expect(await myComputed()).toBe(2);
      a.set(2);
      expect(await myComputed()).toBe(4);
    });
  });
