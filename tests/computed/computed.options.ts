import { describe, test, expect } from "bun:test";
import { type Signal, type SignalValue } from "../../lib";

import { computedKeepAlive } from "./options/computed.keepAlive";
import { computedErrors } from "./options/computed.errors";
import { computedCallbacks } from "./options/computed.callbacks";
import { computedCombinations } from "./options/computed.combinations";

export const computedOptions = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe("options", () => {
    test("should set name for debugging purposes", () => {
      // Verify the internal name property is set correctly
      expect((doubled as any)._name).toBe("doubledValue");
    });

    computedKeepAlive(count);
    computedErrors(count);
    computedCallbacks(count);
    computedCombinations(count);
  });
