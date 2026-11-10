// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkspaceConfig } from '@atomos-web/structura-core';

/**
 * Bounded undo/redo history with nestable transactions.
 * Every undoable change outside a transaction is one step; all undoable changes
 * inside the outermost transaction collapse into a single step.
 */
export interface StoreHistory<S> {
  /** Called after a state change. `undoable` false means "not recorded" (viewport, reconcile, …). */
  readonly onChange: (previous: S, undoable: boolean) => void;
  readonly undo: (current: S) => S | undefined;
  readonly redo: (current: S) => S | undefined;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  /** `amendId`: fold this transaction into history entry `amendId` if it is still the latest. */
  readonly begin: (label: string, current: S, amendId?: number) => void;
  readonly end: (current: S) => void;
  readonly depth: () => number;
  /** Label of the step that `undo()` would revert, when it came from a transaction. */
  readonly undoLabel: () => string | undefined;
  /** Id of the latest undo entry (used to amend it from an async follow-up step). */
  readonly head: () => number | undefined;
}

interface Entry<S> {
  readonly state: S;
  readonly label: string | undefined;
  readonly id: number;
}

export const createStoreHistory = function<S>(limit: number): StoreHistory<S> {
  const past: Entry<S>[] = [];
  const future: Entry<S>[] = [];
  let depth = 0;
  let base: S | undefined;
  let label: string | undefined;
  let amend: number | undefined;
  let dirty = false;
  let nextId = 1;

  const push = (state: S, entryLabel: string | undefined): void => {
    past.push({ state, label: entryLabel, id: nextId++ });
    if (past.length > limit) past.shift();
    future.length = 0;
  };

  /** An amending transaction folds into entry `amend` when it is still the latest step. */
  const canAmend = (): boolean => amend !== undefined && future.length === 0 && past[past.length - 1]?.id === amend;

  const onChange = (previous: S, undoable: boolean): void => {
    if (!undoable) return;
    if (depth > 0) {
      dirty = true;
      return;
    }
    push(previous, undefined);
  };

  const begin = (nextLabel: string, current: S, amendId?: number): void => {
    depth += 1;
    if (depth > 1) return;
    base = current;
    label = nextLabel;
    amend = amendId;
    dirty = false;
  };

  const end = (current: S): void => {
    if (depth === 0) return;
    depth -= 1;
    if (depth > 0) return;
    // Amending keeps the earlier entry: one undo reverts both steps together.
    if (dirty && base !== undefined && base !== current && !canAmend()) push(base, label);
    base = undefined;
    label = undefined;
    amend = undefined;
    dirty = false;
  };

  const undo = (current: S): S | undefined => {
    const entry = past.pop();
    if (!entry) return undefined;
    future.push({ state: current, label: entry.label, id: entry.id });
    return entry.state;
  };

  const redo = (current: S): S | undefined => {
    const entry = future.pop();
    if (!entry) return undefined;
    past.push({ state: current, label: entry.label, id: entry.id });
    return entry.state;
  };

  return {
    onChange, undo, redo, begin, end,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    depth: () => depth,
    undoLabel: () => past[past.length - 1]?.label,
    head: () => past[past.length - 1]?.id,
  };
};

/** True when localStorage persistence is disabled (`persistence: false` or legacy `disableLocalStorage`). */
export const isPersistenceDisabled = (config: WorkspaceConfig | undefined): boolean =>
  config?.persistence === false || config?.disableLocalStorage === true;
