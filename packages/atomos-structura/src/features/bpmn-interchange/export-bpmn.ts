// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { escapeXml, toXmlId } from '../../shared/lib/xml-escape.js';
import { GROUP_NODE_TYPE } from '../../shared/workflow-canvas/group-model.js';
import type { WorkflowCanvasDocument, WorkflowDocumentEdge, WorkflowDocumentNode } from '../../shared/workflow-document/model/document.types.js';
import { BPMN_NS, BPMNDI_NS, DC_NS, DI_NS, isBpmnFlowNode } from './bpmn-model.js';

interface Context {
  readonly doc: WorkflowCanvasDocument;
  readonly ids: ReadonlyMap<string, string>;
  readonly lines: string[];
}

/** Unique NCName per document id (ids that already are NCNames are kept verbatim). */
const assignIds = (doc: WorkflowCanvasDocument): Map<string, string> => {
  const used = new Set<string>();
  const ids = new Map<string, string>();
  [...doc.nodes.map(n => n.id), ...doc.edges.map(e => e.id)].forEach(id => {
    let candidate = toXmlId(id);
    for (let i = 2; used.has(candidate); i += 1) candidate = `${toXmlId(id)}_${i}`;
    used.add(candidate);
    ids.set(id, candidate);
  });
  return ids;
};

const nameAttr = (label: string): string => (label ? ` name="${escapeXml(label)}"` : '');

const tagOf = (node: WorkflowDocumentNode): string => {
  if (node.type === GROUP_NODE_TYPE) return 'subProcess';
  return isBpmnFlowNode(node.type) ? node.type : 'task';
};

/** Flows live in the scope shared by both ends, otherwise at process level. */
const flowScope = (doc: WorkflowCanvasDocument, edge: WorkflowDocumentEdge): string | undefined => {
  const parentOf = (id: string) => doc.nodes.find(n => n.id === id)?.parentId;
  const scope = parentOf(edge.source);
  return scope === parentOf(edge.target) ? scope : undefined;
};

const renderScope = (ctx: Context, scope: string | undefined, indent: string): void => {
  ctx.doc.nodes.filter(n => n.parentId === scope).forEach(node => {
    const tag = tagOf(node);
    const id = ctx.ids.get(node.id) ?? node.id;
    if (tag !== 'subProcess') {
      ctx.lines.push(`${indent}<bpmn:${tag} id="${id}"${nameAttr(node.label)} />`);
      return;
    }
    ctx.lines.push(`${indent}<bpmn:subProcess id="${id}"${nameAttr(node.label)}>`);
    renderScope(ctx, node.id, `${indent}  `);
    ctx.lines.push(`${indent}</bpmn:subProcess>`);
  });
  ctx.doc.edges.filter(edge => flowScope(ctx.doc, edge) === scope).forEach(edge => {
    const [id, source, target] = [edge.id, edge.source, edge.target].map(v => ctx.ids.get(v) ?? v);
    ctx.lines.push(`${indent}<bpmn:sequenceFlow id="${id}" sourceRef="${source}" targetRef="${target}" />`);
  });
};

const center = (node: WorkflowDocumentNode | undefined) =>
  (node ? { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 } : { x: 0, y: 0 });

const renderDiagram = (ctx: Context): void => {
  ctx.lines.push('  <bpmndi:BPMNDiagram id="Diagram_1">', '    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1">');
  ctx.doc.nodes.forEach(node => {
    const id = ctx.ids.get(node.id) ?? node.id;
    const expanded = node.type === GROUP_NODE_TYPE ? ` isExpanded="${node.collapsed ? 'false' : 'true'}"` : '';
    ctx.lines.push(`      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"${expanded}>`,
      `        <dc:Bounds x="${node.position.x}" y="${node.position.y}" width="${node.size.width}" height="${node.size.height}" />`,
      '      </bpmndi:BPMNShape>');
  });
  ctx.doc.edges.forEach(edge => {
    const id = ctx.ids.get(edge.id) ?? edge.id;
    const [from, to] = [edge.source, edge.target].map(n => center(ctx.doc.nodes.find(node => node.id === n)));
    ctx.lines.push(`      <bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">`,
      `        <di:waypoint x="${from?.x}" y="${from?.y}" />`, `        <di:waypoint x="${to?.x}" y="${to?.y}" />`,
      '      </bpmndi:BPMNEdge>');
  });
  ctx.lines.push('    </bpmndi:BPMNPlane>', '  </bpmndi:BPMNDiagram>');
};

/**
 * Serializes a canvas document as BPMN 2.0 XML (process + diagram interchange).
 * Supported: startEvent, endEvent, task, serviceTask, userTask, exclusiveGateway,
 * parallelGateway, sequenceFlow, and `group` -> subProcess. Other node types export as `task`.
 */
export const exportBpmn = (doc: WorkflowCanvasDocument): string => {
  const ctx: Context = { doc, ids: assignIds(doc), lines: [] };
  ctx.lines.push('<?xml version="1.0" encoding="UTF-8"?>',
    `<bpmn:definitions xmlns:bpmn="${BPMN_NS}" xmlns:bpmndi="${BPMNDI_NS}" xmlns:dc="${DC_NS}" xmlns:di="${DI_NS}"`
      + ' id="Definitions_1" targetNamespace="https://codernic.dev/structura/bpmn">',
    '  <bpmn:process id="Process_1" isExecutable="false">');
  renderScope(ctx, undefined, '    ');
  ctx.lines.push('  </bpmn:process>');
  renderDiagram(ctx);
  ctx.lines.push('</bpmn:definitions>');
  return ctx.lines.join('\n');
};
