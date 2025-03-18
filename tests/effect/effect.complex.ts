import { describe, test, expect, mock } from "bun:test";
import { effect, signal, computed } from "../../lib";

export const effectComplex = () =>
  describe("complex", () => {
    test("should handle diamond dependency pattern correctly", () => {
      // Create a diamond dependency pattern:
      //      source
      //     /      \
      //   left    right
      //     \      /
      //      target
      const source = signal(1);
      const left = computed(() => source() * 2);
      const right = computed(() => source() + 10);
      const target = computed(() => left() + right());

      const effectMock = mock();

      effect(() => {
        target();
        effectMock();
      });

      // Initial run
      expect(effectMock).toHaveBeenCalledTimes(1);
      expect(target()).toBe(13); // (1*2) + (1+10)

      // Update source
      source.set(5);

      // Effect should run exactly once despite multiple paths to source
      expect(effectMock).toHaveBeenCalledTimes(2);
      expect(target()).toBe(25); // (5*2) + (5+10)
    });

    test("should track dynamic dependencies correctly", () => {
      const condition = signal(true);
      const valueA = signal("A");
      const valueB = signal("B");
      const dependentMock = mock();

      effect(() => {
        // Dynamically depend on either valueA or valueB based on condition
        const value = condition() ? valueA() : valueB();
        dependentMock(value);
      });

      // Initial run uses valueA
      expect(dependentMock).toHaveBeenLastCalledWith("A");

      // Update valueA should trigger effect
      valueA.set("A updated");
      expect(dependentMock).toHaveBeenLastCalledWith("A updated");

      // Update valueB should not trigger effect
      valueB.set("B updated");
      expect(dependentMock).not.toHaveBeenLastCalledWith("B updated");

      // Change condition to use valueB
      condition.set(false);
      expect(dependentMock).toHaveBeenLastCalledWith("B updated");

      // Now updates to valueA should not trigger effect
      valueA.set("A updated again");
      expect(dependentMock).toHaveBeenCalledTimes(3);

      // But updates to valueB should
      valueB.set("B final update");
      expect(dependentMock).toHaveBeenLastCalledWith("B final update");
    });
  });
