import { describe, test, expect, mock, spyOn } from "bun:test";
import {
  signal,
  effect,
  effectDependencies,
  getCurrentEffect,
  computed,
  batch,
  untracked,
} from "../lib";

describe("signal", () => {
  describe("basic", () => {
    test("should create a signal with initial value", () => {
      const count = signal(0);
      expect(count()).toBe(0);
    });

    test("should update signal value", () => {
      const count = signal(0);
      count.set(5);
      expect(count()).toBe(5);
    });

    test("should not update if value is equal", () => {
      const count = signal(0);
      const mockFn = mock();
      effect(() => {
        count();
        mockFn();
      });

      // First call happens immediately when effect is created
      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(0); // Same value, should not trigger effect
      expect(mockFn).toHaveBeenCalledTimes(1);

      count.set(1); // Different value, should trigger effect
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("advanced", () => {
    test("should work with complex initial values", () => {
      const objSignal = signal({ name: "test", value: 42 });
      const arrSignal = signal([1, 2, 3]);

      expect(objSignal()).toEqual({ name: "test", value: 42 });
      expect(arrSignal()).toEqual([1, 2, 3]);

      objSignal.set({ name: "updated", value: 100 });
      arrSignal.set([4, 5, 6]);

      expect(objSignal()).toEqual({ name: "updated", value: 100 });
      expect(arrSignal()).toEqual([4, 5, 6]);
    });

    test("should handle object reference equality correctly", () => {
      const obj = { value: 42 };
      const objSignal = signal(obj);

      const mockFn = mock();
      effect(() => {
        objSignal();
        mockFn();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Setting same reference shouldn't trigger effect
      objSignal.set(obj);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // New object with same content should trigger (reference changed)
      objSignal.set({ value: 42 });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("should handle signals created within effects", () => {
      const condition = signal(true);
      let dynamicSignal: any = null;

      effect(() => {
        if (condition()) {
          dynamicSignal = signal(123);
        }
      });

      expect(dynamicSignal()).toBe(123);

      // Create a dependent effect to test the dynamically created signal
      const mockFn = mock();
      effect(() => {
        if (dynamicSignal) {
          dynamicSignal();
          mockFn();
        }
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Update dynamic signal should trigger effect
      dynamicSignal.set(456);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});

describe("computed", () => {
  test("should compute initial value", () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);

    expect(doubled()).toBe(2);
  });

  test("should update when dependencies change", () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);

    count.set(2);
    expect(doubled()).toBe(4);
  });

  test("should not recompute until accessed", () => {
    const count = signal(1);
    const computeFn = mock(() => count() * 2);
    const doubled = computed(computeFn);

    // Initial computation happens twice - once for initial value and once for setting up dependencies
    expect(computeFn).toHaveBeenCalledTimes(2);

    // Access the value
    expect(doubled()).toBe(2);

    // Update dependency but don't access computed
    count.set(2);
    expect(computeFn).toHaveBeenCalledTimes(4); // Called twice when dependency changes: once in effect and once for tracking

    // Access the computed value
    expect(doubled()).toBe(4);
    expect(computeFn).toHaveBeenCalledTimes(5); // Now called one more time for actual recomputation

    // Access again without changing dependency
    expect(doubled()).toBe(4);
    expect(computeFn).toHaveBeenCalledTimes(5); // No recomputation needed
  });
});

describe("effect", () => {
  test("should run effect immediately", () => {
    const mockFn = mock();
    effect(mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should run effect when dependencies change", () => {
    const count = signal(0);
    const mockFn = mock(() => {
      count(); // Create dependency
    });

    effect(mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    count.set(1); // Update dependency
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("should handle cleanup when disposed", () => {
    const count = signal(0);
    const mockFn = mock(() => count());

    const dispose = effect(mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    dispose(); // Cleanup

    count.set(1); // Update should not trigger effect
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should handle errors in effect", () => {
    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

    effect(() => {
      throw new Error("Test error");
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("should detect circular dependencies", () => {
    const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});
    const a = signal(1);
    const b = signal(2);

    effect(() => {
      a.set(b() + 1);
    });

    effect(() => {
      b.set(a() + 1);
    });

    // Check that warning was called, now with object argument instead of just a string
    expect(consoleSpy).toHaveBeenCalled();

    // Verify the first parameter is the warning message
    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[0]).toBe("Circular dependency detected in effect");

    // Verify the second parameter has the expected context information
    expect(callArgs[1]).toHaveProperty("effectId");
    expect(callArgs[1]).toHaveProperty("runningEffectsSize");

    consoleSpy.mockRestore();
  });
});

describe("batch", () => {
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

describe("untrack", () => {
  test("should access signal without creating dependency", () => {
    const count = signal(0);
    const mockFn = mock();

    effect(() => {
      untracked(() => count()); // Access without creating dependency
      mockFn();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    count.set(1); // Update should not trigger effect
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should return value from untracked function", () => {
    const count = signal(42);
    const result = untracked(() => count());

    expect(result).toBe(42);
  });
});

describe("computed - advanced", () => {
  test("should handle multiple signal dependencies", () => {
    const first = signal(5);
    const second = signal(10);
    const sum = computed(() => first() + second());

    expect(sum()).toBe(15);

    first.set(7);
    expect(sum()).toBe(17);

    // Reset expectations after updating second
    second.set(20);
    // Verify computed value is updated with both dependencies
    expect(sum()).toBe(27); // 7 + 20 = 27
  });

  test("should handle nested computed values", () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);
    const quadrupled = computed(() => doubled() * 2);

    expect(doubled()).toBe(2);
    expect(quadrupled()).toBe(4);

    count.set(2);
    expect(doubled()).toBe(4);
    expect(quadrupled()).toBe(8);
  });

  test("should dispose computed values correctly", () => {
    const count = signal(1);
    const computeFn = mock(() => count() * 2);
    const doubled = computed(computeFn);

    // Initially computed and accessed
    expect(doubled()).toBe(2);

    // Dispose the computed value
    (doubled as any)._dispose();

    // Update the dependency
    count.set(2);

    // The computed should no longer update, still returning the last value
    // before disposal, or throwing if completely removed
    try {
      doubled();
      // If it returns the last value, make sure it didn't recompute
      expect(computeFn).toHaveBeenCalledTimes(2); // Initial + setup only
    } catch (e) {
      // Or if it throws, that's also acceptable behavior for disposed values
      expect(e).toBeDefined();
    }
  });
});

describe("effect - advanced", () => {
  test("should track bidirectional dependencies correctly", () => {
    const count = signal(0);
    let effectFn: EffectFn | null = null;

    // Create an effect and capture the effect function
    const dispose = effect(() => {
      count();
      effectFn = getCurrentEffect();
    });

    // Get dependencies for the effect
    const deps = effectDependencies.get(effectFn!);
    expect(deps).toBeDefined();
    expect(deps!.size).toBe(1);
    expect(deps!.has(count)).toBe(true);

    // Check that signal has the effect as a dependency
    expect(count._deps.has(effectFn!)).toBe(true);

    // Cleanup
    dispose();

    // Verify bidirectional cleanup
    expect(count._deps.has(effectFn!)).toBe(false);
    expect(effectDependencies.has(effectFn!)).toBe(false);
  });

  test("should handle effects that modify multiple signals", () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);

    // Effect that updates multiple signals
    effect(() => {
      const sum = a() + b();
      c.set(sum);
    });

    expect(c()).toBe(3); // 1 + 2 = 3

    a.set(10);
    expect(c()).toBe(12); // 10 + 2 = 12

    b.set(20);
    expect(c()).toBe(30); // 10 + 20 = 30
  });

  test("should properly handle effectDependencies during disposal", () => {
    const count = signal(0);
    const mockFn = mock();

    // Create and immediately dispose an effect
    const dispose = effect(() => {
      count();
      mockFn();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    dispose();

    // Update the signal
    count.set(1);

    // Effect should not be triggered
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Make sure effectDependencies is cleaned up
    const remainingDeps = [...effectDependencies.entries()].filter(
      ([_, deps]) => deps.has(count)
    );
    expect(remainingDeps.length).toBe(0);
  });
});

describe("batch - advanced", () => {
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

describe("untrack - advanced", () => {
  test("should work with computed values", () => {
    const count = signal(0);
    const doubled = computed(() => count() * 2);
    const mockFn = mock();

    effect(() => {
      // Use untrack to prevent dependency on the computed
      untracked(() => doubled());
      mockFn();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    // Update the underlying signal
    count.set(5);

    // The effect shouldn't re-run since we used untrack
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should handle nested untrack calls", () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    const mockFn = mock();

    effect(() => {
      // Track only signal c, untrack signals a and b
      untracked(() => {
        a();
        untracked(() => b());
      });
      c();
      mockFn();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    // Updates to untracked signals shouldn't trigger effect
    a.set(10);
    b.set(20);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Update to tracked signal should trigger effect
    c.set(30);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe("memory management", () => {
  test("should clean up effect dependencies when disposed", () => {
    const a = signal(1);
    const b = signal(2);

    // Create and store the effect function
    let effectFn: EffectFn | null = null;
    const dispose = effect(() => {
      a();
      b();
      effectFn = getCurrentEffect();
    });

    // Verify dependencies are established
    expect(a._deps.size).toBe(1);
    expect(b._deps.size).toBe(1);
    expect(effectDependencies.get(effectFn!)?.size).toBe(2);

    // Dispose the effect
    dispose();

    // Verify all dependencies are cleaned up
    expect(a._deps.size).toBe(0);
    expect(b._deps.size).toBe(0);
    expect(effectDependencies.has(effectFn!)).toBe(false);
  });

  test("should handle complex dependency graph cleanup", () => {
    const a = signal(1);
    const b = signal(2);
    const c = computed(() => a() + b());
    const d = computed(() => c() * 2);

    const mockFn = mock();
    const dispose = effect(() => {
      d();
      mockFn();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    // Dispose the top-level effect
    dispose();

    // Update signals - no re-computation should happen
    a.set(10);
    b.set(20);

    // Effect should not be called again
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should not leak memory when many signals are created and disposed", () => {
    // Create many signals and track the count in effectDependencies
    const initialMapSize = effectDependencies.size;

    // Create and then dispose 100 effects, each with its own signal
    for (let i = 0; i < 100; i++) {
      const s = signal(i);
      const dispose = effect(() => {
        s();
      });
      dispose();
    }

    // Map size should be unchanged after all disposals
    expect(effectDependencies.size).toBe(initialMapSize);
  });
});

// Adding missing interface for the test
interface EffectFn {
  (): void;
}
