import { describe, test, expect, mock } from "bun:test";
import { effect, batch, type Signal } from "../../lib";
import { testCategories } from "../setup";

export const batchBasic = (count: Signal<number>) =>
  describe(testCategories.basic, () => {
    test("should batch multiple updates", () => {
      const mockFn = mock();

      effect(() => {
        count();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      batch(() => {
        count.set(1);
        count.set(2);
        count.set(3);
      });

      // Effect should only run once after batch
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(count()).toBe(3);
    });

    test("should handle nested batches", () => {
      const mockFn = mock();

      effect(() => {
        count();
        mockFn();
      });

      batch(() => {
        count.set(1);

        batch(() => {
          count.set(2);
        });

        count.set(3);
      });

      // Effect should only run once after all batches
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(count()).toBe(3);
    });

    test("should return value from batch function", () => {
      const result = batch(() => {
        return "test result";
      });

      expect(result).toBe("test result");
    });
  });
