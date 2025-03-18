import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";

export const effectNested = () =>
  describe("nested", () => {
    test("should handle effects created inside other effects", () => {
      const outer = signal(0);
      const inner = signal(0);

      const outerMock = mock();
      const innerMock = mock();

      // Create an effect that conditionally creates another effect
      effect(() => {
        outerMock();
        outer();

        // Create a nested effect when outer value >= 5
        if (outer() >= 5) {
          effect(() => {
            inner();
            innerMock();
          });
        }
      });

      // Initial run
      expect(outerMock).toHaveBeenCalledTimes(1);
      expect(innerMock).toHaveBeenCalledTimes(0);

      // Update outer to 5, should create inner effect
      outer.set(5);
      expect(outerMock).toHaveBeenCalledTimes(2);
      expect(innerMock).toHaveBeenCalledTimes(1);

      // Update inner, should trigger inner effect but not outer
      inner.set(1);
      expect(outerMock).toHaveBeenCalledTimes(2);
      expect(innerMock).toHaveBeenCalledTimes(2);
    });

    test("should correctly clean up nested effects when parent effect disposes", () => {
      const condition = signal(true);
      const value = signal(0);
      const nestedMock = mock();

      // Keep track of the nested effect's disposal function
      let nestedDisposer: (() => void) | null = null;

      const dispose = effect(() => {
        // Only create the nested effect when condition is true
        if (condition()) {
          nestedDisposer = effect(() => {
            value();
            nestedMock();
          });
        }
      });

      // Initial setup - nested effect runs
      expect(nestedMock).toHaveBeenCalledTimes(1);

      // Update value to trigger nested effect
      value.set(1);
      expect(nestedMock).toHaveBeenCalledTimes(2);

      // Dispose parent effect
      dispose();

      // Update value again
      value.set(2);

      // Nested effect should not run again
      expect(nestedMock).toHaveBeenCalledTimes(2);
    });
  });
