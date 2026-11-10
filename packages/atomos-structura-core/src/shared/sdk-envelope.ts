// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Standard `--json` result envelope (browser-safe: no Node.js imports). */
export interface SdkEnvelope<T = unknown> {
  ok: boolean;
  namespace: string;
  data: T | null;
  error: string | null;
}

export const successEnvelope = <T>(data: T): SdkEnvelope<T> => ({
  ok: true,
  namespace: '@atomos-web/structura',
  data,
  error: null,
});

export const errorEnvelope = (error: string): SdkEnvelope<null> => ({
  ok: false,
  namespace: '@atomos-web/structura',
  data: null,
  error,
});
