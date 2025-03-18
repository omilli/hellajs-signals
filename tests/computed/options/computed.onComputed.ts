import { describe, test, expect, mock } from "bun:test";
import { signal, computed, effect, type Signal } from "../../../lib";

export const computedOnComputed = (count: Signal<number>) =>
  describe("onComputed", () => {
    test("should call onComputed when value is computed", () => {
      // Tests that the onComputed callback is called whenever the computed value
      // is recomputed, with the new value passed as an argument
      const onComputedMock = mock();

      // Create computed with callback
      const doubled = computed(() => count() * 2, {
        onComputed: onComputedMock,
      });

      // Initial computation should trigger callback
      expect(doubled()).toBe(2);
      expect(onComputedMock).toHaveBeenCalledTimes(1);
      expect(onComputedMock).toHaveBeenCalledWith(2);

      // Update and access should trigger callback with new value
      count.set(2);
      expect(doubled()).toBe(4);
      expect(onComputedMock).toHaveBeenCalledTimes(2);
      expect(onComputedMock).toHaveBeenCalledWith(4);
    });

    test("should call onComputed for keepAlive computed even when not accessed", () => {
      // Tests that onComputed is called for keepAlive computed signals even when
      // the value hasn't been explicitly accessed after a dependency change
      const count = signal(0);
      const onComputedMock = mock();

      // Create keepAlive computed with callback
      computed(() => count() * 2, {
        keepAlive: true,
        onComputed: onComputedMock,
      });

      // Initial computation should trigger callback
      expect(onComputedMock).toHaveBeenCalledTimes(1);
      expect(onComputedMock).toHaveBeenCalledWith(0);

      // Update should trigger computation and callback without access
      count.set(5);
      expect(onComputedMock).toHaveBeenCalledTimes(2);
      expect(onComputedMock).toHaveBeenCalledWith(10);
    });

    test("should not track dependencies in onComputed callback", () => {
      // Tests that signal reads inside the onComputed callback don't create
      // dependency relationships, preventing circular dependencies
      const effectSpy = mock();
      const trackingSpy = signal(0);

      // Create computed with callback that reads a signal
      computed(() => count() * 2, {
        onComputed: () => {
          // This read should not create a dependency
          trackingSpy();
        },
      });

      // Create effect that explicitly depends on trackingSpy
      effect(() => {
        trackingSpy();
        effectSpy();
      });

      // Initial effect run
      expect(effectSpy).toHaveBeenCalledTimes(1);

      // Update count - if onComputed created a dependency, this would trigger effectSpy
      count.set(2);
      expect(effectSpy).toHaveBeenCalledTimes(1);

      // Direct update to trackingSpy should trigger effect
      trackingSpy.set(1);
      expect(effectSpy).toHaveBeenCalledTimes(2);
    });
  });
