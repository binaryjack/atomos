export interface Signal<T> {
  readonly value: T;
  readonly set: (value: T) => void;
  readonly subscribe: (callback: (value: T) => void) => () => void;
}

export interface SignalCleanup {
  readonly destroy: () => void;
}

export interface ComputedSignal<T> extends Pick<Signal<T>, 'value' | 'subscribe'> {
  readonly readonly: true;
}