import { describe, test, expect, mock } from "bun:test";
import { effect, signal } from "../../lib";
import { tick } from "../setup";

export const effectDebounce = () =>
  describe("debounce", () => {
    test("should properly debounce rapid updates", async () => {
      const source = signal(0);
      const effectResults: number[] = [];
      const effectRun = mock(() => {
        effectResults.push(source());
      });

      // Create a debounced effect
      effect(
        () => {
          source();
          effectRun();
        },
        {
          debounce: 50,
        }
      );

      // Initial run should execute immediately
      expect(effectRun).toHaveBeenCalledTimes(1);
      expect(effectResults).toEqual([0]);

      // Schedule multiple rapid updates
      source.set(1);
      source.set(2);
      source.set(3);

      // Wait for less than debounce time - effect shouldn't have run yet
      await tick(20);
      expect(effectRun).toHaveBeenCalledTimes(1); // Still just the initial run

      // Wait for debounce period to complete
      await tick(); // Total 60ms > 50ms debounce

      // Effect should have run exactly once more with the final value
      expect(effectRun).toHaveBeenCalledTimes(2);
      expect(effectResults).toEqual([0, 3]); // Initial value and final debounced value
    });

    test("should reset debounce timer when new updates arrive", async () => {
      const source = signal("initial");
      const effectMock = mock();

      effect(
        () => {
          source();
          effectMock();
        },
        { debounce: 50 }
      );

      // Initial run
      expect(effectMock).toHaveBeenCalledTimes(1);

      // First update
      source.set("update 1");

      // Wait some time but less than debounce period
      await tick(30);
      expect(effectMock).toHaveBeenCalledTimes(1); // Not run yet

      // Another update - should reset the timer
      source.set("update 2");

      // Wait again but not quite to debounce time
      await tick(30);
      expect(effectMock).toHaveBeenCalledTimes(1); // Still not run

      // Wait for debounce to complete
      await tick(30);
      expect(effectMock).toHaveBeenCalledTimes(2); // Now it's run
    });

    test("should properly clean up debounced effects", async () => {
      const source = signal(0);
      const effectMock = mock();

      // Create and immediately get the dispose function
      const dispose = effect(
        () => {
          source();
          effectMock();
        },
        { debounce: 50 }
      );

      // Initial run happens immediately
      expect(effectMock).toHaveBeenCalledTimes(1);

      // Trigger a debounced update
      source.set(99);

      // Dispose before debounce completes
      dispose();

      // Wait past debounce time
      await tick();

      // Effect should not have run again
      expect(effectMock).toHaveBeenCalledTimes(1);
    });
  });
