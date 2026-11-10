// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Async CRUD repository contract used by the legacy property bridge. */
export interface IRepository<T> {
  readonly findById: (id: string) => Promise<T | undefined>;
  readonly findAll: () => Promise<readonly T[]>;
  readonly create: (data: Partial<T>) => Promise<T>;
  readonly update: (id: string, data: Partial<T>) => Promise<T>;
  readonly delete: (id: string) => Promise<void>;
}
