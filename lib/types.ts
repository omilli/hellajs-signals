export interface SignalBase {
  (): unknown;
  _deps: Set<WeakRef<EffectFn>>;
}

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
  _deps: Set<WeakRef<EffectFn>>;
}

export type EffectFn = () => void;

export type ComputedFn<T> = () => T;

export type CleanupFunction = () => void;

export interface ComputedAccessor<T> extends SignalValue<T> {
  _dispose(): void;
}

export interface SignalOptions<T> {
  name?: string;
  validators?: Array<(value: T) => boolean>;
  onSet?: (newValue: unknown, oldValue: unknown) => void;
}
