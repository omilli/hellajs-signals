import { describe, test, expect, mock } from "bun:test";
import { signal, computed, type Signal } from "../../../lib";

export const computedOnError = (count: Signal<number>) =>
  describe("onError", () => {
    test("should call onError when computation throws", () => {
      // Tests that the onError handler is called when the computation function throws an error
      // Verifies error is passed correctly to the handler
      const errorHandler = mock();
      const testError = new Error("Computation error");

      // Create computed that throws when count > 0
      const failing = computed(
        () => {
          if (count() > 0) throw testError;
          return count();
        },
        { onError: errorHandler }
      );

      // Initial computation with error
      expect(failing()).toBeUndefined();

      // Update to cause the error during computation
      count.set(1);

      // Access should trigger error handler
      try {
        failing();
      } catch (e) {
        // Error might be re-thrown depending on implementation
      }

      // Error handler should be called for initial, effect, and access
      expect(errorHandler).toHaveBeenCalledTimes(3);
      expect(errorHandler).toHaveBeenCalledWith(testError);
    });

    test("should prevent errors from propagating when onError is provided", () => {
      // Tests that providing an onError handler prevents errors from propagating
      // to calling code, allowing graceful error handling
      const errorCount = signal(0);

      // Create computed with error handler that doesn't rethrow
      const failing = computed(
        () => {
          if (errorCount() > 0) throw new Error("Should be caught");
          return errorCount();
        },
        { onError: () => {} }
      );

      // Initial computation succeeds
      expect(failing()).toBe(0);

      // Update to trigger error
      errorCount.set(1);

      // Access should not propagate the error
      expect(() => failing()).not.toThrow();
    });
  });
