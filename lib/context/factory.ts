import { createReactiveState } from "../utils/state";
import { registerContextState, withContext } from "./utils";
import type {
  CleanupFunction,
  ComputedFn,
  EffectFn,
  EffectOptions,
  ReactiveContext,
  ReactiveContextDependencies,
  Signal,
  SignalOptions,
  SignalValue,
} from "../types";

/**
 * Creates an isolated reactive context
 *
 * A reactive context provides a complete set of reactive primitives
 * (signals, effects, computed values) that operate independently from
 * other contexts. This allows for isolated reactivity systems that
 * don't interfere with each other.
 *
 * @returns A reactive context object with API methods
 */
export function createReactiveContext(
  dependencies: ReactiveContextDependencies
): ReactiveContext {
  // Create a unique ID for this context
  const id = `ctx_${Math.random().toString(36).slice(2, 10)}`;

  // Create reactive state for this context
  const state = createReactiveState(id);

  // Create context API object
  const context: ReactiveContext = {
    signal: <T>(initialValue: T, options?: SignalOptions<T>): Signal<T> => {
      return withContext(context, () => {
        const s = dependencies.signal(initialValue, options);
        // Track signal in this context
        state.signals.add(s);
        return s;
      });
    },

    effect: (fn: EffectFn, options?: EffectOptions): CleanupFunction => {
      return withContext(context, () => {
        const cleanup = dependencies.effect(fn, options);

        // Track effect for potential context disposal
        state.effects.add(cleanup);

        // Enhanced cleanup to remove from tracked effects
        const wrappedCleanup = () => {
          state.effects.delete(cleanup);
          return cleanup();
        };

        // Copy properties from original cleanup function
        Object.getOwnPropertyNames(cleanup).forEach((prop) => {
          if (prop !== "name" && prop !== "length") {
            Object.defineProperty(
              wrappedCleanup,
              prop,
              Object.getOwnPropertyDescriptor(cleanup, prop)!
            );
          }
        });

        // Ensure _effect property is transferred
        if ((cleanup as any)._effect) {
          Object.defineProperty(wrappedCleanup, "_effect", {
            value: (cleanup as any)._effect,
          });
        }

        return wrappedCleanup;
      });
    },

    computed: <T>(deriveFn: ComputedFn<T>): SignalValue<T> => {
      return withContext(context, () => {
        return dependencies.computed(deriveFn);
      });
    },

    batch: <T>(fn: () => T): T => {
      return withContext(context, () => {
        return dependencies.batch(fn);
      });
    },

    untracked: <T>(fn: () => T): T => {
      return withContext(context, () => {
        return dependencies.untracked(fn);
      });
    },
  };

  // Register state for this context
  registerContextState(context, state);

  return context;
}
