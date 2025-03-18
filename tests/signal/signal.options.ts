import { describe, test, expect } from "bun:test";
import { signal } from "../../lib";
import { signalOnSet } from "./options/signal.onSet";
import { signalValidators } from "./options/signal.validators";

export const signalOptions = () =>
  describe("options", () => {
    // Tests the name option which is useful for debugging signals
    test("should support name option for debugging", () => {
      const count = signal(0, { name: "count" });
      // @ts-ignore: Accessing internal property for testing
      expect(count._name).toBe("count");
    });

    signalOnSet();
    signalValidators();
  });
