import { describe, test, expect } from "bun:test";
import {
  createContext,
  getDefaultContext,
  getCurrentContext,
  registerContextState,
  withContext,
} from "../../lib";
import { createReactiveState } from "../../lib/utils";

export const contextAPI = () =>
  describe("API", () => {
    test("registerContextState associates a state with a context", () => {
      const ctx = createContext();
      const customState = createReactiveState("custom-test-state");

      // Register custom state with the context
      registerContextState(ctx, customState);

      // Use withContext to verify the state is associated correctly
      withContext(ctx, () => {
        const currentState = getCurrentContext();
        expect(currentState).toBe(customState);
        expect(currentState.id).toBe("custom-test-state");
      });
    });

    test("withContext correctly sets and restores current context", () => {
      const ctx1 = createContext();
      const ctx2 = createContext();

      // Initial context should be default
      getDefaultContext();

      // Run with ctx1
      const result1 = withContext(ctx1, () => {
        expect(getCurrentContext().id).toInclude("ctx_");

        // Nested context should work
        return withContext(ctx2, () => {
          expect(getCurrentContext().id).toInclude("ctx_");
          return "inner value";
        });
      });

      expect(result1).toBe("inner value");

      // Context should be restored after withContext
      expect(getCurrentContext()).not.toBe(ctx1);
      expect(getCurrentContext()).not.toBe(ctx2);
    });

    test("withContext restores context when exceptions occur", () => {
      const ctx = createContext();

      try {
        withContext(ctx, () => {
          expect(getCurrentContext().id).toInclude("context-");
          throw new Error("Test error");
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
      }

      // Context should be restored after exception
      const currentState = getCurrentContext();
      expect(currentState.id).not.toInclude("context-" + ctx);
    });
  });
