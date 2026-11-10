// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Signal } from '@atomos-web/prime';
import type { CanvasAdapter } from '../../shared/core/adapters/canvas-adapter.js';

const DEBOUNCE_MS = 100;
const round = (value: number): number => Math.round(value * 10) / 10;
const near = (a: number, b: number): boolean => Math.abs(round(a) - round(b)) < 0.1;

interface Pair { readonly a: number; readonly b: number }

/**
 * Debounced write-back of a UI geometry signal (position or size) into the domain store.
 * The store is re-read when the timer fires, so a value that was already persisted
 * (drag-end flush, undo, reconcile) never produces a duplicate, history-polluting write.
 */
const persistPair = (
  read: () => Pair | undefined, write: (pair: Pair) => void
): ((pair: Pair) => () => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flushLater = (pair: Pair): (() => void) => {
    const stored = read();
    if (stored && near(stored.a, pair.a) && near(stored.b, pair.b)) return () => undefined;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      const latest = read();
      if (latest && !(near(latest.a, pair.a) && near(latest.b, pair.b))) write({ a: round(pair.a), b: round(pair.b) });
    }, DEBOUNCE_MS);
    return () => { if (timer !== undefined) clearTimeout(timer); };
  };
  return flushLater;
};

/** Wires position and dimension signals of one entity to debounced domain persistence. */
export const createGeometryPersistence = (
  entityId: string,
  adapter: CanvasAdapter,
  position: Signal<{ x: number; y: number }>,
  dimensions: Signal<{ width: number; height: number }>
): (() => void) => {
  const persistPosition = persistPair(
    () => { const e = adapter.getEntity(entityId); return e ? { a: e.position.x, b: e.position.y } : undefined; },
    pair => adapter.moveEntity(entityId, pair.a, pair.b),
  );
  const persistSize = persistPair(
    () => { const e = adapter.getEntity(entityId); return e ? { a: e.dimensions.width, b: e.dimensions.height } : undefined; },
    pair => adapter.resizeEntity(entityId, pair.a, pair.b),
  );
  let cancelPosition: () => void = () => undefined;
  let cancelSize: () => void = () => undefined;
  const unsubPosition = position.subscribe(p => { cancelPosition = persistPosition({ a: p.x, b: p.y }); });
  const unsubSize = dimensions.subscribe(d => { cancelSize = persistSize({ a: d.width, b: d.height }); });
  return () => {
    unsubPosition();
    unsubSize();
    cancelPosition();
    cancelSize();
  };
};
