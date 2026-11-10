// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

export type Unsubscribe = () => void;

/** Strongly typed synchronous event emitter. Handler errors are isolated and reported. */
export interface TypedEmitter<M extends object> {
  readonly on: <K extends keyof M>(event: K, handler: (payload: M[K]) => void) => Unsubscribe;
  readonly emit: <K extends keyof M>(event: K, payload: M[K]) => void;
  readonly listenerCount: <K extends keyof M>(event: K) => number;
  readonly clear: () => void;
}

export const createTypedEmitter = function<M extends object>(): TypedEmitter<M> {
  const handlers = new Map<keyof M, Set<(payload: never) => void>>();

  const on = <K extends keyof M>(event: K, handler: (payload: M[K]) => void): Unsubscribe => {
    const set = handlers.get(event) ?? new Set();
    set.add(handler as (payload: never) => void);
    handlers.set(event, set);
    return () => { set.delete(handler as (payload: never) => void); };
  };

  const emit = <K extends keyof M>(event: K, payload: M[K]): void => {
    const set = handlers.get(event);
    if (!set) return;
    Array.from(set).forEach(handler => {
      try {
        (handler as (value: M[K]) => void)(payload);
      } catch (error) {
        console.error(`[Structura] '${String(event)}' handler failed:`, error);
      }
    });
  };

  return {
    on,
    emit,
    listenerCount: event => handlers.get(event)?.size ?? 0,
    clear: () => handlers.clear(),
  };
};
