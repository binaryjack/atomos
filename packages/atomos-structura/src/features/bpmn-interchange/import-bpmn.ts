// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { GROUP_NODE_TYPE } from '../../shared/workflow-canvas/group-model.js';
import {
  CURRENT_DOCUMENT_SCHEMA_VERSION, type DocumentValidationResult, type WorkflowDocumentEdge, type WorkflowDocumentNode,
} from '../../shared/workflow-document/model/document.types.js';
import { validateCanvasDocument } from '../../shared/workflow-document/model/validate-document.js';
import { BPMN_NS, BPMNDI_NS, bpmnDefaultSize, bpmnPorts, isBpmnFlowNode } from './bpmn-model.js';

export interface XmlParser {
  readonly parseFromString: (source: string, type: 'application/xml') => Document;
}

interface Shape { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly expanded: boolean }

interface Collected {
  readonly nodes: WorkflowDocumentNode[];
  readonly edges: WorkflowDocumentEdge[];
  readonly shapes: ReadonlyMap<string, Shape>;
}

const fail = (message: string): DocumentValidationResult => ({ ok: false, errors: [{ path: '', code: 'invalid-value', message }] });

/** Local name without prefix (some DOM implementations keep `bpmn:` in localName). */
const localOf = (el: Element): string => (el.localName ?? el.tagName).split(':').pop() ?? '';

/** Namespace check that tolerates parsers which do not resolve prefixes. */
const inNamespace = (el: Element, ns: string, prefix: string): boolean =>
  el.namespaceURI === ns || el.tagName.startsWith(`${prefix}:`) || (el.namespaceURI === null && !el.tagName.includes(':'));

const findAll = (root: Element, ns: string, prefix: string, name: string, out: Element[] = []): Element[] => {
  Array.from(root.children).forEach(child => {
    if (localOf(child) === name && inNamespace(child, ns, prefix)) out.push(child);
    findAll(child, ns, prefix, name, out);
  });
  return out;
};

const childrenIn = (el: Element, ns: string): Element[] => Array.from(el.children).filter(child => inNamespace(child, ns, 'bpmn'));

const readShapes = (doc: Document): Map<string, Shape> => {
  const shapes = new Map<string, Shape>();
  findAll(doc.documentElement, BPMNDI_NS, 'bpmndi', 'BPMNShape').forEach(shape => {
    const bounds = Array.from(shape.children).find(child => localOf(child) === 'Bounds');
    const num = (name: string) => Number(bounds?.getAttribute(name) ?? NaN);
    const element = shape.getAttribute('bpmnElement');
    if (!element || !bounds) return;
    shapes.set(element, { x: num('x'), y: num('y'), width: num('width'), height: num('height'), expanded: shape.getAttribute('isExpanded') !== 'false' });
  });
  return shapes;
};

const toNode = (el: Element, type: string, parentId: string | undefined, shapes: ReadonlyMap<string, Shape>): WorkflowDocumentNode => {
  const id = el.getAttribute('id') ?? '';
  const isGroup = type === GROUP_NODE_TYPE;
  const shape = shapes.get(id);
  const size = shape ? { width: shape.width, height: shape.height } : bpmnDefaultSize(isGroup ? 'subProcess' : (isBpmnFlowNode(type) ? type : 'task'));
  return {
    id,
    type,
    label: el.getAttribute('name') ?? '',
    position: shape ? { x: shape.x, y: shape.y } : { x: 0, y: 0 },
    size,
    config: {},
    metadata: {},
    ports: isBpmnFlowNode(type) ? bpmnPorts(type) : [],
    ...(parentId ? { parentId } : {}),
    ...(isGroup && shape && !shape.expanded ? { collapsed: true } : {}),
  };
};

const walk = (scope: Element, parentId: string | undefined, out: Collected): void => {
  childrenIn(scope, BPMN_NS).forEach(el => {
    const name = localOf(el);
    if (isBpmnFlowNode(name)) out.nodes.push(toNode(el, name, parentId, out.shapes));
    else if (name === 'subProcess') {
      out.nodes.push(toNode(el, GROUP_NODE_TYPE, parentId, out.shapes));
      walk(el, el.getAttribute('id') ?? undefined, out);
    } else if (name === 'sequenceFlow') {
      out.edges.push({ id: el.getAttribute('id') ?? '', source: el.getAttribute('sourceRef') ?? '', target: el.getAttribute('targetRef') ?? '' });
    }
  });
};

/** Connects flows port-to-port when both ends expose typed ports. */
const withPorts = (edges: readonly WorkflowDocumentEdge[], nodes: readonly WorkflowDocumentNode[]): WorkflowDocumentEdge[] => {
  const ports = new Map(nodes.map(n => [n.id, new Set(n.ports.map(p => p.id))]));
  return edges.map(edge => ({
    ...edge,
    ...(ports.get(edge.source)?.has('out') ? { sourcePortId: 'out' } : {}),
    ...(ports.get(edge.target)?.has('in') ? { targetPortId: 'in' } : {}),
  }));
};

/**
 * Parses BPMN 2.0 XML (documented subset, see `exportBpmn`) into a validated canvas document.
 * Unsupported BPMN elements are ignored. Requires a DOMParser (browser) or an injected parser.
 */
export const importBpmn = (xml: string, parser?: XmlParser): DocumentValidationResult => {
  const xmlParser = parser ?? (typeof DOMParser === 'undefined' ? undefined : new DOMParser());
  if (!xmlParser) return fail('No XML parser available: pass one to importBpmn(xml, parser)');
  const doc = xmlParser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length > 0 || localOf(root) !== 'definitions') return fail('Malformed BPMN XML');
  const process = findAll(root, BPMN_NS, 'bpmn', 'process')[0];
  if (!process) return fail('BPMN document has no <bpmn:process>');
  const collected: Collected = { nodes: [], edges: [], shapes: readShapes(doc) };
  walk(process, undefined, collected);
  return validateCanvasDocument({
    schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
    nodes: collected.nodes,
    edges: withPorts(collected.edges, collected.nodes),
    viewport: { x: 0, y: 0, zoom: 1 },
  });
};
