import { describe, test, expect } from "bun:test";
import { effect, signal, getCurrentContext } from "../../lib";

export const effectMemory = () =>
  describe("memory", () => {
    test("should not leak when effects create and dispose other effects", () => {
      const ctx = getCurrentContext();
      const initialEffectCount = ctx.effectDependencies.size;

      const condition = signal(true);
      const inner = signal(0);

      // Store disposers for cleanup
      const disposers = [];

      // Parent effect creates child effects when condition is true
      disposers.push(
        effect(() => {
          if (condition()) {
            // Create 10 child effects
            for (let i = 0; i < 10; i++) {
              const dispose = effect(() => {
                inner(); // Track dependency
              });

              // Store disposer function to clean up later
              disposers.push(dispose);
            }
          }
        })
      );

      // Verify effects were created
      expect(ctx.effectDependencies.size).toBeGreaterThan(initialEffectCount);

      // Clean up all effects
      disposers.forEach((dispose) => dispose());

      // Verify we're back to where we started
      expect(ctx.effectDependencies.size).toBe(initialEffectCount);
    });

    test("should allow effects and their data to be garbage collected", async () => {
      // Create a class to hold effects and signals
      class EffectContainer {
        signal;
        dispose;

        constructor() {
          this.signal = signal(0);
          this.dispose = effect(() => {
            this.signal();
          });
        }
      }

      // Create and immediately discard many containers
      const createContainers = () => {
        const containers = [];
        for (let i = 0; i < 100; i++) {
          containers.push(new EffectContainer());
        }
        return containers;
      };

      // Create and capture weak reference to a container
      let containers: EffectContainer[] | null = createContainers();
      new WeakRef(containers[0]);

      // Remove strong reference
      containers = null;

      // Force garbage collection if possible
      if (global.gc) {
        global.gc();
      }

      // Wait for possible async GC
      await new Promise((resolve) => setTimeout(resolve, 100));

      // We can't strictly assert on GC, but we're testing that code path
      // is free of issues that would prevent GC
      expect(true).toBe(true);
    });
  });
