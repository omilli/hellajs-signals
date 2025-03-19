import type {
  ComputedFn,
  ComputedOptions,
  ContextState,
  EffectFn,
  EffectOptions,
  ReactiveContext,
  Signal,
  SignalOptions,
  SignalValue,
} from "../types";
import { createReactiveState } from "../utils/state";
import { registerContextState } from "./utils";

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
  dependencies: ReactiveContext
): ReactiveContext {
  const id = `ctx_${Math.random().toString(36).slice(2, 10)}`;
  const state = createReactiveState(id);
  const context = createContext(dependencies, state);
  registerContextState(context, state);
  return context;
}

function createContext(dependencies: ReactiveContext, state: ContextState) {
  const context = {} as ReactiveContext;

  context.signal = <T>(
    initialValue: T,
    options?: SignalOptions<T>
  ): Signal<T> => {
    const s = dependencies.signal(initialValue, options);
    state.signals.add(s);
    return s;
  };

  context.effect = (fn: EffectFn, options?: EffectOptions): EffectFn => {
    const cleanup = dependencies.effect(fn, options) as EffectFn;
    const wrappedCleanup = () => {
      state.effects.delete(cleanup);
      return cleanup();
    };

    state.effects.add(cleanup);

    for (const prop of Object.getOwnPropertyNames(cleanup)) {
      if (prop !== "name" && prop !== "length") {
        Object.defineProperty(
          wrappedCleanup,
          prop,
          Object.getOwnPropertyDescriptor(cleanup, prop) as PropertyDescriptor
        );
      }
    }

    if (cleanup._effect) {
      Object.defineProperty(wrappedCleanup, "_effect", {
        value: cleanup._effect,
      });
    }

    return wrappedCleanup;
  };

  context.computed = <T>(
    computedFn: ComputedFn<T>,
    options?: ComputedOptions<T>
  ): SignalValue<T> => dependencies.computed(computedFn, options);

  context.batch = <T>(fn: () => T): T => dependencies.batch(fn);

  context.untracked = <T>(fn: () => T): T => dependencies.untracked(fn);

  return context;
}
