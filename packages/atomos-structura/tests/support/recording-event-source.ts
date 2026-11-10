// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Map-backed Storage replacement. */
export const createMemoryStorage = () => {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
    clear: () => { Object.keys(data).forEach(k => delete data[k]); },
    get length() { return Object.keys(data).length; },
    key: (i: number) => Object.keys(data)[i] ?? null,
  };
};

/** Minimal container element exposing appendChild for mount assertions. */
export const createContainerStub = (id = 'app') => ({
  id,
  children: [] as unknown[],
  style: {} as CSSStyleDeclaration,
  appendChild(child: unknown) { this.children.push(child); },
});
