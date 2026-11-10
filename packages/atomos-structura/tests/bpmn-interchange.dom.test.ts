// @vitest-environment jsdom
// jsdom is used here because happy-dom 14 parses 'application/xml' as HTML.
// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { exportBpmn } from '../src/features/bpmn-interchange/export-bpmn.js';
import { importBpmn } from '../src/features/bpmn-interchange/import-bpmn.js';
import { escapeXml } from '../src/shared/lib/xml-escape.js';
import type { WorkflowCanvasDocument, WorkflowDocumentNode } from '../src/shared/workflow-document/model/document.types.js';

const node = (id: string, type: string, x: number, extra: Partial<WorkflowDocumentNode> = {}): WorkflowDocumentNode => ({
  id, type, label: id, position: { x, y: 100 }, size: { width: 100, height: 80 }, config: {}, metadata: {}, ports: [], ...extra,
});

const doc: WorkflowCanvasDocument = {
  schemaVersion: 3,
  nodes: [
    node('start', 'startEvent', 0, { size: { width: 36, height: 36 } }),
    node('review', 'userTask', 100, { label: 'Review <draft> & "approve"' }),
    node('gate', 'exclusiveGateway', 250, { size: { width: 50, height: 50 } }),
    node('sub', 'group', 350, { label: 'Fulfil', size: { width: 350, height: 200 } }),
    node('ship', 'serviceTask', 380, { parentId: 'sub' }),
    node('notify', 'task', 520, { parentId: 'sub' }),
    node('join', 'parallelGateway', 750, { size: { width: 50, height: 50 } }),
    node('end', 'endEvent', 850, { size: { width: 36, height: 36 } }),
  ],
  edges: [
    { id: 'f1', source: 'start', target: 'review' }, { id: 'f2', source: 'review', target: 'gate' },
    { id: 'f3', source: 'gate', target: 'sub' }, { id: 'f4', source: 'ship', target: 'notify' },
    { id: 'f5', source: 'sub', target: 'join' }, { id: 'f6', source: 'join', target: 'end' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe('BPMN 2.0 interchange', () => {
  it('exports the documented subset with escaped names, nested subProcess and DI bounds', () => {
    const xml = exportBpmn(doc);
    expect(xml).toContain('<bpmn:userTask id="review" name="Review &lt;draft&gt; &amp; &quot;approve&quot;" />');
    expect(xml).toMatch(/<bpmn:subProcess id="sub" name="Fulfil">\s*<bpmn:serviceTask id="ship"/);
    expect(xml).toContain('<bpmn:sequenceFlow id="f4" sourceRef="ship" targetRef="notify" />');
    expect(xml).toContain('<dc:Bounds x="350" y="100" width="350" height="200" />');
  });

  it('round-trips through import with types, labels, containment, positions and port-to-port flows', () => {
    const result = importBpmn(exportBpmn(doc));
    expect(result.ok ? [] : result.errors).toEqual([]);
    if (!result.ok) return;
    const byId = new Map(result.document.nodes.map(n => [n.id, n]));
    doc.nodes.forEach(original => {
      expect(byId.get(original.id)).toMatchObject({
        type: original.type, label: original.label, position: original.position, size: original.size,
        ...(original.parentId ? { parentId: original.parentId } : {}),
      });
    });
    expect(result.document.edges.map(e => e.id).sort()).toEqual(['f1', 'f2', 'f3', 'f4', 'f5', 'f6']);
    expect(result.document.edges.find(e => e.id === 'f1')).toMatchObject({ sourcePortId: 'out', targetPortId: 'in' });
    expect(result.document.edges.find(e => e.id === 'f3')).toMatchObject({ sourcePortId: 'out' });
    expect(result.document.edges.find(e => e.id === 'f3')?.targetPortId).toBeUndefined();
  });

  it('rejects malformed XML and documents without a process', () => {
    expect(importBpmn('<bpmn:definitions').ok).toBe(false);
    expect(importBpmn('<?xml version="1.0"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"/>')).toMatchObject({ ok: false });
  });

  it('escapes every XML special character and strips invalid control characters', () => {
    expect(escapeXml(`a&b<c>d"e'f\u0001`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});
