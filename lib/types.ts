// Types
export interface SignalValue<T> {
  (): T;
  _cleanup: () => void;
  _isComputed: boolean;
}
export type SignalSetter<T> = (value: T) => void;
export interface Signal<T> {
  (): T;
  set: SignalSetter<T>;
  update: (updater: (value: T) => T) => void;
  _value: T;
  _deps: Set<EffectFn>;
}
export type EffectFn = () => void;
export type ComputedFn<T> = () => T;
export type CleanupFunction = () => void;

// New type for equality functions
export type EqualityFn<T> = (a: T, b: T) => boolean;

export interface ComputedAccessor<T> extends SignalValue<T> {
  _dispose(): void;
}
