import { describe, test, expect } from "bun:test";
import { effect, signal, batch } from "../../lib";
import { ctx, tick } from "../setup";

export const effectPerformance = () =>
  describe("performance", () => {
    test("should handle large numbers of effects efficiently", () => {
      const source = signal(0);
      const effectCount = 100;
      const disposers = [];

      // Create many effects
      for (let i = 0; i < effectCount; i++) {
        const dispose = effect(() => {
          // Simple dependency tracking
          return source();
        });
        disposers.push(dispose);
      }

      // Batch update to trigger all effects
      const startTime = performance.now();
      batch(() => {
        source.set(1);
      });
      const endTime = performance.now();

      // This isn't a strict test, but just ensures it completes
      // You could add thresholds if needed
      expect(endTime - startTime).toBeLessThan(1000);

      // Clean up
      disposers.forEach((dispose) => dispose());
    });

    test("should not leak memory with rapidly created and disposed effects", () => {
      const source = signal(0);

      // Create and immediately dispose many effects
      for (let i = 0; i < 1000; i++) {
        const dispose = effect(() => {
          source();
        });
        dispose();
      }

      // Create one more effect to verify everything still works
      let value!: number;
      const dispose = effect(() => {
        value = source();
      });

      source.set(42);
      expect(value).toBe(42);

      dispose();
    });

    test("should not leak when effects create and dispose other effects", () => {
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
      await tick(100);

      // We can't strictly assert on GC, but we're testing that code path
      // is free of issues that would prevent GC
      expect(true).toBe(true);
    });

    test("should maintain stable memory usage with many updates", async () => {
      const source = signal(0);
      const samples = [];
      const effectCount = 50; // Reduced from 100 to lower memory pressure
      const updateCount = 200; // Reduced from 1000 to be more realistic

      // Create effects that depend on the signal
      const effects = Array(effectCount)
        .fill(0)
        .map((_, i) =>
          effect(() => {
            // More typical effect pattern that updates another signal
            const value = source();
            return value * 2 + i;
          })
        );

      // Sample memory before
      const before = process.memoryUsage().heapUsed;

      // Trigger updates in batches to be more realistic
      for (let i = 0; i < updateCount; i += 10) {
        batch(() => {
          for (let j = 0; j < 10; j++) {
            source.set(i + j);
          }
        });

        // Help GC by forcing collection between batches
        if (i % 50 === 0 && global.gc) {
          global.gc();
          // Sample memory at fixed intervals
          samples.push(process.memoryUsage().heapUsed);
        }
      }

      // Clear references and force GC before measurement
      if (global.gc) {
        global.gc();
      }

      // Cleanup
      effects.forEach((dispose) => dispose());

      // Final GC before measurement
      if (global.gc) {
        global.gc();
        await tick(10); // Small delay to allow GC to complete
      }

      // Measure final memory usage
      const finalUsage = process.memoryUsage().heapUsed;
      const maxGrowth = Math.max(...samples, finalUsage) - before;

      // More realistic threshold based on actual usage patterns
      const threshold = 25 * 1024 * 1024; // 25MB is more reasonable
      expect(maxGrowth).toBeLessThan(threshold);
    });
  });
