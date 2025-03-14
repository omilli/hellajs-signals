import { describe, test, expect, mock } from "bun:test";
import { signal, effect, batch } from "../lib";

describe("batch", () => {
  describe("basic", () => {
    test("should batch multiple updates", () => {
      const count = signal(0);
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
      const count = signal(0);
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

  describe("advanced", () => {
    test("should handle errors during batch operations", () => {
      const count = signal(0);
      const mockFn = mock();

      effect(() => {
        count();
        mockFn();
      });

      expect(() => {
        batch(() => {
          count.set(1);
          throw new Error("Test error in batch");
        });
      }).toThrow("Test error in batch");

      // Despite the error, the signal should be updated
      // and the effect should have run exactly once
      expect(count()).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("should batch updates across multiple signals", () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);
      const mockFn = mock();

      effect(() => {
        // This effect depends on all three signals
        a() + b() + c();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update all signals in one batch
      batch(() => {
        a.set(10);
        b.set(20);
        c.set(30);
      });

      // Effect should only run once despite 3 signal updates
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("should handle effects that trigger other effects during batch", () => {
      const primary = signal(0);
      const secondary = signal(0);
      const mockPrimary = mock();
      const mockSecondary = mock();

      // First effect updates secondary when primary changes
      effect(() => {
        secondary.set(primary() * 2);
        mockPrimary();
      });

      // Second effect just tracks secondary
      effect(() => {
        secondary();
        mockSecondary();
      });

      // Initial effects have run
      expect(mockPrimary).toHaveBeenCalledTimes(1);
      expect(mockSecondary).toHaveBeenCalledTimes(1);

      // Batch update primary
      batch(() => {
        primary.set(5);
      });

      // Both effects should have run exactly once
      expect(mockPrimary).toHaveBeenCalledTimes(2);
      expect(mockSecondary).toHaveBeenCalledTimes(2);
      expect(secondary()).toBe(10);
    });
  });
});
