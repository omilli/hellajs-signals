// Types
export type SignalValue<T> = () => T;
export type SignalSetter<T> = (value: T) => void;
export type Signal<T> = {
  (): T;
  set: SignalSetter<T>;
  _value: T;
  _deps: Set<EffectFn>;
};
export type EffectFn = () => void;
export type ComputedFn<T> = () => T;
export type CleanupFunction = () => void;
