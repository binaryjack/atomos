// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** Escapes text for XML attribute values and character data. Drops characters invalid in XML 1.0. */
export const escapeXml = (value: string): string =>
  value
    .replace(/[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/[&<>"']/g, ch => ENTITIES[ch] ?? ch);

/** XML NCName-safe identifier (BPMN ids must be NCNames). */
export const toXmlId = (value: string): string => {
  const cleaned = value.replace(/[^A-Za-z0-9_.-]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
};
