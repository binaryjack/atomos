// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { remapAnchorId, remapSubgraph } from '../src/shared/workflow-canvas/remap-subgraph.js';

describe('copy / paste id remapping', () => {
  const snapshot = {
    entities: [
      { id: 'a', name: 'A', position: { x: 0, y: 0 }, nodeType: 'task' },
      { id: 'b', name: 'B', position: { x: 100, y: 50 } },
    ],
    links: [
      { id: 'l1', sourceEntityId: 'a', targetEntityId: 'b', sourceAnchorId: 'a::out', targetAnchorId: 'b::in' },
      { id: 'l2', sourceEntityId: 'a', targetEntityId: 'outside', sourceAnchorId: 'a::out', targetAnchorId: 'outside::in' },
      { id: 'l3', sourceEntityId: 'b', targetEntityId: 'a', sourceAnchorId: 'b-anchor-top', targetAnchorId: 'a-anchor-bottom' },
    ],
  };
  let counter = 0;
  const copy = remapSubgraph(snapshot, () => `new-${++counter}`, { x: 32, y: 16 }, name => `${name} (copy)`);

  it('assigns new ids, offsets positions and keeps node fields', () => {
    expect(copy.entities.map(e => e.id)).toEqual(['new-1', 'new-2']);
    expect(copy.entities[0]).toMatchObject({ name: 'A (copy)', position: { x: 32, y: 16 }, nodeType: 'task' });
    expect(copy.idMap.get('b')).toBe('new-2');
  });

  it('keeps only links between copied nodes and remaps port and side anchors', () => {
    expect(copy.links).toHaveLength(2);
    expect(copy.links[0]).toMatchObject({ sourceEntityId: 'new-1', targetEntityId: 'new-2', sourceAnchorId: 'new-1::out', targetAnchorId: 'new-2::in' });
    expect(copy.links[1]).toMatchObject({ sourceAnchorId: 'new-2-anchor-top', targetAnchorId: 'new-1-anchor-bottom' });
    expect(copy.links.every(l => !['l1', 'l3'].includes(l.id))).toBe(true);
  });

  it('falls back to side anchors when no anchor was recorded', () => {
    expect(remapAnchorId(undefined, 'x', 'y', 'right')).toBe('y-anchor-right');
  });
});
