import { describe, test, expect, mock } from "bun:test";
import { signal, effect, createContext } from "../../lib";

export const contextIsolation = () =>
  describe("basic isolation", () => {
    test("contexts should be completely isolated from each other", () => {
      // Create two separate contexts
      const ctx1 = createContext();
      const ctx2 = createContext();

      // Create signals in each context
      const count1 = ctx1.signal(0);
      const count2 = ctx2.signal(0);

      // Create effects in each context
      const effect1Mock = mock();
      const effect2Mock = mock();

      ctx1.effect(() => {
        count1(); // Create dependency
        effect1Mock();
      });

      ctx2.effect(() => {
        count2(); // Create dependency
        effect2Mock();
      });

      // Initial run of both effects
      expect(effect1Mock).toHaveBeenCalledTimes(1);
      expect(effect2Mock).toHaveBeenCalledTimes(1);

      // Update from context 1 should only trigger effect1
      count1.set(1);
      expect(effect1Mock).toHaveBeenCalledTimes(2);
      expect(effect2Mock).toHaveBeenCalledTimes(1);

      // Update from context 2 should only trigger effect2
      count2.set(1);
      expect(effect1Mock).toHaveBeenCalledTimes(2);
      expect(effect2Mock).toHaveBeenCalledTimes(2);
    });

    test("contexts should not leak to default context", () => {
      // Create an isolated context
      const ctx = createContext();

      // Create signals in isolated and default contexts
      const isolatedCount = ctx.signal(0);
      const defaultCount = signal(0);

      // Create effects in both contexts
      const isolatedMock = mock();
      const defaultMock = mock();

      ctx.effect(() => {
        isolatedCount(); // Create dependency in isolated context
        isolatedMock();
      });

      effect(() => {
        defaultCount(); // Create dependency in default context
        defaultMock();
      });

      // Initial run of both effects
      expect(isolatedMock).toHaveBeenCalledTimes(1);
      expect(defaultMock).toHaveBeenCalledTimes(1);

      // Update from isolated context should only trigger isolated effect
      isolatedCount.set(1);
      expect(isolatedMock).toHaveBeenCalledTimes(2);
      expect(defaultMock).toHaveBeenCalledTimes(1);

      // Update from default context should only trigger default effect
      defaultCount.set(1);
      expect(isolatedMock).toHaveBeenCalledTimes(2);
      expect(defaultMock).toHaveBeenCalledTimes(2);
    });
  });
