// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DocumentErrorCode, DocumentValidationError } from './document.types.js';

export type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Collects validation errors while a document is being normalized. */
export interface ErrorSink {
  readonly errors: DocumentValidationError[];
}

export const createErrorSink = (): ErrorSink => ({ errors: [] });

export const report = (sink: ErrorSink, path: string, code: DocumentErrorCode, message: string): void => {
  sink.errors.push({ path, code, message });
};

export const requireString = (sink: ErrorSink, obj: JsonRecord, key: string, path: string): string | undefined => {
  const value = obj[key];
  if (typeof value === 'string' && value.length > 0) return value;
  const code: DocumentErrorCode = value === undefined ? 'missing-field' : 'invalid-type';
  report(sink, `${path}/${key}`, code, `Expected a non-empty string at ${path}/${key}`);
  return undefined;
};

export const optionalString = (sink: ErrorSink, obj: JsonRecord, key: string, path: string): string | undefined => {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  report(sink, `${path}/${key}`, 'invalid-type', `Expected a string at ${path}/${key}`);
  return undefined;
};

export const requireNumber = (sink: ErrorSink, obj: JsonRecord, key: string, path: string): number | undefined => {
  const value = obj[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const code: DocumentErrorCode = value === undefined ? 'missing-field' : 'invalid-type';
  report(sink, `${path}/${key}`, code, `Expected a finite number at ${path}/${key}`);
  return undefined;
};

export const optionalBoolean = (sink: ErrorSink, obj: JsonRecord, key: string, path: string): boolean | undefined => {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  report(sink, `${path}/${key}`, 'invalid-type', `Expected a boolean at ${path}/${key}`);
  return undefined;
};

export const optionalRecord = (sink: ErrorSink, obj: JsonRecord, key: string, path: string): JsonRecord => {
  const value = obj[key];
  if (value === undefined || value === null) return {};
  if (isRecord(value)) return { ...value };
  report(sink, `${path}/${key}`, 'invalid-type', `Expected an object at ${path}/${key}`);
  return {};
};

export const requireArray = (sink: ErrorSink, obj: JsonRecord, key: string, path: string): readonly unknown[] => {
  const value = obj[key];
  if (Array.isArray(value)) return value;
  const code: DocumentErrorCode = value === undefined ? 'missing-field' : 'invalid-type';
  report(sink, `${path}/${key}`, code, `Expected an array at ${path}/${key}`);
  return [];
};

export const oneOf = <T extends string>(
  sink: ErrorSink, value: unknown, allowed: readonly T[], path: string
): T | undefined => {
  if (value === undefined || value === null) return undefined;
  const match = allowed.find(candidate => candidate === value);
  if (match !== undefined) return match;
  report(sink, path, 'invalid-value', `Expected one of ${allowed.join(', ')} at ${path}`);
  return undefined;
};
