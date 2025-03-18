import { describe, test, expect } from "bun:test";
import { type Signal, type SignalValue } from "../../lib";

import { computedKeepAlive } from "./options/computed.keepAlive";
import { computedOnError } from "./options/computed.onError";
import { computedOnComputed } from "./options/computed.onComputed";
import { computedCombinations } from "./options/computed.combinations";

export const computedOptions = (
  count: Signal<number>,
  doubled: SignalValue<number>
) =>
  describe("options", () => {
    test("should set name for debugging purposes", () => {
      // Tests that the name option is correctly set on the computed signal
      // This helps with debugging by providing meaningful names in dev tools
      expect((doubled as any)._name).toBe("doubledValue");
    });

    computedKeepAlive(count);
    computedOnError(count);
    computedOnComputed(count);
    computedCombinations(count);
  });
