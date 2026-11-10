// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Reads an optional, untyped extension field (legacy or host-specific) from a model object. */
export function field(source: object, key: string): unknown {
    return (source as Record<string, unknown>)[key];
}

/** Reads a nested `metadata.<key>` extension field. */
export function metaFlag(source: object, key: string): boolean {
    const meta = field(source, 'metadata');
    return typeof meta === 'object' && meta !== null && Boolean((meta as Record<string, unknown>)[key]);
}

/** Returns the first defined, non-empty value among the given fields. */
export function firstField(source: object, keys: string[]): unknown {
    for (const key of keys) {
        const value = field(source, key);
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
}
