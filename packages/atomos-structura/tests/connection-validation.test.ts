// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { PortSpec } from '@atomos-web/structura-core';
import type { ConnectionGraph } from '../src/shared/workflow-canvas/connection-validation.types.js';
import { validateConnection } from '../src/shared/workflow-canvas/validate-connection.js';

const out = (id: string, dataType = 'json', extra: Partial<PortSpec> = {}): PortSpec => ({ id, direction: 'out', dataType, ...extra });
const inp = (id: string, dataType = 'json', extra: Partial<PortSpec> = {}): PortSpec => ({ id, direction: 'in', dataType, ...extra });

const graph = (
  nodes: Array<[string, PortSpec[], string?]>,
  edges: Array<[string, string, string, string]> = []
): ConnectionGraph => ({
  nodes: new Map(nodes.map(([id, ports, nodeType]) => [id, { id, ports, ...(nodeType ? { nodeType } : {}) }])),
  edges: edges.map(([sn, sp, tn, tp], i) => ({ id: `e${i}`, source: { nodeId: sn, portId: sp }, target: { nodeId: tn, portId: tp } })),
});

const ref = (nodeId: string, portId: string) => ({ nodeId, portId });

describe('validateConnection built-in checks', () => {
  const base = graph([['a', [out('o'), inp('i')]], ['b', [inp('i'), out('o')]]]);

  it('accepts out -> in with equal data types', () => {
    expect(validateConnection(ref('a', 'o'), ref('b', 'i'), base)).toEqual({ ok: true });
  });

  it('rejects wrong directions', () => {
    expect(validateConnection(ref('a', 'i'), ref('b', 'i'), base).ok).toBe(false);
    expect(validateConnection(ref('a', 'o'), ref('b', 'o'), base).ok).toBe(false);
  });

  it('rejects self loops and unknown ports', () => {
    expect(validateConnection(ref('a', 'o'), ref('a', 'i'), base)).toMatchObject({ ok: false, reason: expect.stringContaining('itself') });
    expect(validateConnection(ref('a', 'missing'), ref('b', 'i'), base).ok).toBe(false);
  });

  it('rejects duplicates and respects `multiple` on inputs', () => {
    const connected = graph([['a', [out('o')]], ['b', [inp('i')]], ['c', [out('o')]]], [['a', 'o', 'b', 'i']]);
    expect(validateConnection(ref('a', 'o'), ref('b', 'i'), connected)).toMatchObject({ ok: false, reason: expect.stringContaining('already') });
    expect(validateConnection(ref('c', 'o'), ref('b', 'i'), connected)).toMatchObject({ ok: false, reason: expect.stringContaining('single') });
    const multi = graph([['a', [out('o')]], ['b', [inp('i', 'json', { multiple: true })]], ['c', [out('o')]]], [['a', 'o', 'b', 'i']]);
    expect(validateConnection(ref('c', 'o'), ref('b', 'i'), multi).ok).toBe(true);
  });

  it('respects multiple: false on outputs', () => {
    const g = graph([['a', [out('o', 'json', { multiple: false })]], ['b', [inp('i')]], ['c', [inp('i')]]], [['a', 'o', 'b', 'i']]);
    expect(validateConnection(ref('a', 'o'), ref('c', 'i'), g).ok).toBe(false);
  });

  it('checks data type assignability (any is a wildcard, isAssignable is pluggable)', () => {
    const g = graph([['a', [out('o', 'string'), out('any', 'any')]], ['b', [inp('i', 'number')]]]);
    expect(validateConnection(ref('a', 'o'), ref('b', 'i'), g)).toMatchObject({ ok: false, reason: expect.stringContaining('not assignable') });
    expect(validateConnection(ref('a', 'any'), ref('b', 'i'), g).ok).toBe(true);
    const lenient = { isAssignable: (from: string, to: string) => from === 'string' && to === 'number' };
    expect(validateConnection(ref('a', 'o'), ref('b', 'i'), g, lenient).ok).toBe(true);
  });

  it('prevents cycles only when asked', () => {
    const g = graph([['a', [out('o'), inp('i')]], ['b', [out('o'), inp('i')]]], [['a', 'o', 'b', 'i']]);
    expect(validateConnection(ref('b', 'o'), ref('a', 'i'), g).ok).toBe(true);
    expect(validateConnection(ref('b', 'o'), ref('a', 'i'), g, { preventCycles: true })).toMatchObject({ ok: false, reason: expect.stringContaining('cycle') });
  });

  it('applies node-type topology rules', () => {
    const g = graph([['s', [out('o')], 'start'], ['e', [inp('i')], 'end']]);
    const topology = { rulesByNodeType: { end: { allowedSources: ['task'], allowedTargets: [] as string[] } } };
    expect(validateConnection(ref('s', 'o'), ref('e', 'i'), g, { topology }).ok).toBe(false);
  });

  it('runs the custom validator after built-ins pass, with refs and graph', () => {
    const custom = vi.fn(() => ({ ok: false as const, reason: 'business rule' }));
    expect(validateConnection(ref('a', 'o'), ref('b', 'i'), base, {}, custom)).toEqual({ ok: false, reason: 'business rule' });
    expect(custom).toHaveBeenCalledWith(ref('a', 'o'), ref('b', 'i'), base);
    custom.mockClear();
    validateConnection(ref('a', 'i'), ref('b', 'i'), base, {}, custom);
    expect(custom).not.toHaveBeenCalled();
  });

  it('skips port checks for ER entities without typed ports', () => {
    const er = graph([['u', []], ['o', []]]);
    expect(validateConnection(ref('u', 'u-anchor-right'), ref('o', 'o-anchor-left'), er).ok).toBe(true);
  });
});
