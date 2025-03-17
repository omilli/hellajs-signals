import { describe, test, expect, mock } from "bun:test";
import { createContext } from "../../lib";

export const contextCommunication = () =>
  describe("cross-context communications", () => {
    test("signals from one context should work in another but maintain isolation", () => {
      const ctx1 = createContext();
      const ctx2 = createContext();

      // Create a signal in context 1
      const sharedSignal = ctx1.signal("shared");

      // Create effects in both contexts tracking the same signal
      const effect1Mock = mock();
      const effect2Mock = mock();

      ctx1.effect(() => {
        sharedSignal(); // Track in context 1
        effect1Mock();
      });

      ctx2.effect(() => {
        sharedSignal(); // Track in context 2
        effect2Mock();
      });

      // Initial run of both effects
      expect(effect1Mock).toHaveBeenCalledTimes(1);
      expect(effect2Mock).toHaveBeenCalledTimes(1);

      // Update should trigger effects in both contexts
      sharedSignal.set("updated");
      expect(effect1Mock).toHaveBeenCalledTimes(2);
      expect(effect2Mock).toHaveBeenCalledTimes(2);

      // But each context maintains its own tracking system
      // Create a signal in context 2 only tracked there
      const ctx2Signal = ctx2.signal("ctx2only");
      ctx2.effect(() => {
        ctx2Signal();
        sharedSignal(); // Also track the shared signal
      });

      // Updating ctx2Signal shouldn't affect context 1
      ctx2Signal.set("changed");
      expect(effect1Mock).toHaveBeenCalledTimes(2); // Unchanged
    });
  });
