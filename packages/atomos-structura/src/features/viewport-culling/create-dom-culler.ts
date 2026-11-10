// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { parsePortAnchorId } from '../../shared/workflow-node/model/port-anchor.js';

interface Box { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
interface ValueOf<T> { readonly value: T }

export interface CullableNode {
  readonly position: ValueOf<{ x: number; y: number }>;
  readonly dimensions: ValueOf<{ width: number; height: number }>;
}

export interface CullStats {
  readonly mountedNodes: number;
  readonly culledNodes: number;
  readonly mountedEdges: number;
  readonly culledEdges: number;
}

export interface DomCullerOptions {
  /** World container whose direct children are nodes, link paths, link labels and side anchors. */
  readonly contentRoot: Element;
  readonly nodes: () => ReadonlyMap<string, CullableNode>;
  readonly viewport: () => { readonly pan: { readonly x: number; readonly y: number }; readonly zoom: number };
  readonly viewportSize: () => { readonly width: number; readonly height: number };
  /** World-space margin kept mounted around the visible area. Default 200. */
  readonly margin?: number;
  /** Below this node count nothing is culled. Default 150. */
  readonly minNodes?: number;
}

/** Entity owning an anchor id (typed port `${id}::${port}` or ER side `${id}-anchor-${side}`). */
export const anchorOwner = (anchorId: string | null): string | null => {
  if (!anchorId) return null;
  return parsePortAnchorId(anchorId)?.nodeId ?? anchorId.split('-anchor-')[0] ?? null;
};

const visibleBox = (options: DomCullerOptions, margin: number): Box => {
  const { pan, zoom } = options.viewport();
  const size = options.viewportSize();
  const x0 = -pan.x / zoom - margin;
  const y0 = -pan.y / zoom - margin;
  return { x0, y0, x1: x0 + size.width / zoom + margin * 2, y1: y0 + size.height / zoom + margin * 2 };
};

const intersects = (node: CullableNode, box: Box): boolean => {
  const { x, y } = node.position.value;
  const { width, height } = node.dimensions.value;
  return x + width >= box.x0 && x <= box.x1 && y + height >= box.y0 && y <= box.y1;
};

type Kind = 'node' | 'edge' | 'label' | 'side' | 'other';

const classify = (el: Element): Kind => {
  if (el.hasAttribute('data-entity-id')) return 'node';
  if (el.hasAttribute('data-link-id') && !el.hasAttribute('data-link-label-for')) return 'edge';
  if (el.hasAttribute('data-link-label-for')) return 'label';
  return el.hasAttribute('data-entity-edge-for') ? 'side' : 'other';
};

/**
 * Viewport culling that works inside a shadow root: only nodes intersecting the viewport
 * (plus a margin) and edges touching them stay mounted; everything else is detached from the
 * DOM and re-mounted on pan / zoom. Works on the world container, never on `document`.
 */
export const createDomCuller = (options: DomCullerOptions) => {
  const margin = options.margin ?? 200;
  const minNodes = options.minNodes ?? 150;
  const detached = new Set<Element>();

  const decide = (el: Element, visibleNodes: ReadonlySet<string>, edgeVisible: Map<string, boolean>): boolean => {
    switch (classify(el)) {
      case 'node': return visibleNodes.has(el.getAttribute('data-entity-id') ?? '');
      case 'side': return visibleNodes.has(el.getAttribute('data-entity-edge-for') ?? '');
      case 'edge': {
        const owners = [anchorOwner(el.getAttribute('data-source-id')), anchorOwner(el.getAttribute('data-target-id'))];
        const visible = owners.some(owner => owner !== null && visibleNodes.has(owner));
        edgeVisible.set(el.getAttribute('data-link-id') ?? '', visible);
        return visible;
      }
      case 'label': return edgeVisible.get(el.getAttribute('data-link-label-for') ?? '') ?? true;
      default: return true;
    }
  };

  const update = (): CullStats => {
    const nodes = options.nodes();
    const cullAll = nodes.size >= minNodes;
    const box = visibleBox(options, margin);
    const visibleNodes = new Set(Array.from(nodes).filter(([, node]) => !cullAll || intersects(node, box)).map(([id]) => id));
    const edgeVisible = new Map<string, boolean>();
    const all = [...Array.from(options.contentRoot.children), ...detached]
      .sort((a, b) => Number(classify(a) === 'label') - Number(classify(b) === 'label'));
    let stats = { mountedNodes: 0, culledNodes: 0, mountedEdges: 0, culledEdges: 0 };
    const toMount: Element[] = [];
    const toDetach: Element[] = [];
    all.forEach(el => {
      const keep = decide(el, visibleNodes, edgeVisible);
      if (keep && detached.has(el)) toMount.push(el);
      if (!keep && !detached.has(el)) toDetach.push(el);
      stats = tally(stats, classify(el), keep);
    });
    applyChanges(options.contentRoot, detached, toMount, toDetach);
    return stats;
  };

  return {
    update,
    /** Re-mounts everything (e.g. before export / snapshot) and forgets detached elements. */
    restoreAll: (): void => { detached.forEach(el => options.contentRoot.appendChild(el)); detached.clear(); },
  };
};

/** Above this many changes the container is rebuilt in one DOM operation instead of per element. */
const BULK_THRESHOLD = 64;

const applyChanges = (root: Element, detached: Set<Element>, toMount: Element[], toDetach: Element[]): void => {
  toMount.forEach(el => detached.delete(el));
  toDetach.forEach(el => detached.add(el));
  if (toMount.length + toDetach.length <= BULK_THRESHOLD) {
    toDetach.forEach(el => el.remove());
    toMount.forEach(el => remount(root, el));
    return;
  }
  const gone = new Set(toDetach);
  const kept = Array.from(root.children).filter(el => !gone.has(el));
  const groups = toMount.filter(el => el.getAttribute('data-node-type') === 'group');
  const others = toMount.filter(el => el.getAttribute('data-node-type') !== 'group');
  root.replaceChildren(...groups, ...kept, ...others);
};

/** Containers go back behind everything else; other elements on top. */
const remount = (root: Element, el: Element): void => {
  if (el.getAttribute('data-node-type') === 'group') root.insertBefore(el, root.firstChild);
  else root.appendChild(el);
};

const tally = (stats: CullStats, kind: Kind, keep: boolean): CullStats => {
  if (kind === 'node') return keep ? { ...stats, mountedNodes: stats.mountedNodes + 1 } : { ...stats, culledNodes: stats.culledNodes + 1 };
  if (kind === 'edge') return keep ? { ...stats, mountedEdges: stats.mountedEdges + 1 } : { ...stats, culledEdges: stats.culledEdges + 1 };
  return stats;
};
