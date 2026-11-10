// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Multi-selection of node ids, owned by one canvas instance. */
export interface SelectionModel {
  readonly get: () => readonly string[];
  readonly has: (id: string) => boolean;
  readonly set: (ids: Iterable<string>) => void;
  readonly toggle: (id: string) => void;
  readonly add: (id: string) => void;
  readonly remove: (ids: Iterable<string>) => void;
  readonly clear: () => void;
  readonly subscribe: (listener: (ids: readonly string[]) => void) => () => void;
}

const sameMembers = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && Array.from(a).every(id => b.has(id));

export const createSelectionModel = function(): SelectionModel {
  let selected: ReadonlySet<string> = new Set();
  const listeners = new Set<(ids: readonly string[]) => void>();

  const replace = (next: ReadonlySet<string>): void => {
    if (sameMembers(selected, next)) return;
    selected = next;
    const snapshot = Array.from(selected);
    listeners.forEach(listener => listener(snapshot));
  };

  return {
    get: () => Array.from(selected),
    has: id => selected.has(id),
    set: ids => replace(new Set(ids)),
    add: id => replace(new Set([...selected, id])),
    toggle: id => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id); else next.add(id);
      replace(next);
    },
    remove: ids => {
      const next = new Set(selected);
      Array.from(ids).forEach(id => next.delete(id));
      replace(next);
    },
    clear: () => replace(new Set()),
    subscribe: listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
};
