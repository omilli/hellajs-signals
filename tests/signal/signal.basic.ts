import { describe, test, expect } from "bun:test";
import { type Signal } from "../../lib";
import { testCategories } from "../setup";

export const signalBasic = (count: Signal<number>) =>
  describe(testCategories.basic, () => {
    test("should create a signal with initial value", () => {
      expect(count()).toBe(0);
    });

    test("should update signal value", () => {
      count.set(5);
      expect(count()).toBe(5);
    });
  });
