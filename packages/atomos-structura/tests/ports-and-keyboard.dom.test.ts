// @vitest-environment happy-dom
// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { PortSpec } from '@atomos-web/structura-core';
import { bindCanvasKeyboard, type CanvasKeyboardActions } from '../src/features/canvas-keyboard/bind-canvas-keyboard.js';
import { applyEdgeOverlay, applyNodeOverlay } from '../src/features/node-overlay/apply-node-overlay.js';
import { createPortHandles } from '../src/features/workflow-ports/create-port-handles.js';
import type { Signal } from '../src/shared/core/types/signal.types.js';
import type { WorkspaceManager } from '../src/shared/core/types/workspace-manager.types.js';
import { getCanvasRuntime } from '../src/shared/workflow-canvas/canvas-runtime.js';

const signal = <T>(initial: T): Signal<T> => {
  let value = initial;
  const listeners = new Set<(v: T) => void>();
  return {
    get value() { return value; },
    set: (next: T) => { value = next; listeners.forEach(l => l(next)); },
    subscribe: (l: (v: T) => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  };
};

const ports: PortSpec[] = [
  { id: 'a', direction: 'in', dataType: 'json', label: 'First' },
  { id: 'b', direction: 'in', dataType: 'json' },
  { id: 'result', direction: 'out', dataType: 'json' },
];

const mountHandles = (instanceId: string) => {
  const workspace = { startLinkFromAnchor: vi.fn(), finalizeLinkToAnchor: vi.fn() } as unknown as WorkspaceManager;
  const dimensions = signal({ width: 200, height: 90 });
  const handles = createPortHandles({
    instanceId, entityId: 'node-1', ports, position: signal({ x: 100, y: 50 }), dimensions, workspace, isReadonly: false,
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.appendChild(handles.element);
  document.body.replaceChildren(svg);
  const byId = (id: string): Element => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element ${id}`);
    return element;
  };
  return { workspace, dimensions, handles, byId };
};

describe('typed port handles', () => {
  it('renders one handle per port with stable ids, inputs left and outputs right, evenly spaced', () => {
    const { handles, byId } = mountHandles('ports-1');
    expect(Array.from(handles.element.children).map(el => el.id)).toEqual(['node-1::a', 'node-1::b', 'node-1::result']);
    expect(['node-1::a', 'node-1::b', 'node-1::result'].map(id => byId(id).getAttribute('transform')))
      .toEqual(['translate(0,30)', 'translate(0,60)', 'translate(200,45)']);
    expect(byId('node-1::a').getAttribute('aria-label')).toBe('Input port First (json)');
    expect(byId('node-1::result').getAttribute('role')).toBe('button');
    expect(getCanvasRuntime('ports-1').portHandles.has('node-1::result')).toBe(true);
  });

  it('re-spaces handles on resize and unregisters them on cleanup', () => {
    const { handles, dimensions, byId } = mountHandles('ports-2');
    dimensions.set({ width: 300, height: 120 });
    expect(byId('node-1::result').getAttribute('transform')).toBe('translate(300,60)');
    handles.cleanup();
    expect(getCanvasRuntime('ports-2').portHandles.size).toBe(0);
  });

  it('starts connections from outputs and completes them on inputs', () => {
    const { workspace, byId } = mountHandles('ports-3');
    byId('node-1::result').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    expect(workspace.startLinkFromAnchor).toHaveBeenCalledWith('node-1::result', { x: 300, y: 95 }, 'node-1', 'right', expect.anything());
    byId('node-1::b').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(workspace.finalizeLinkToAnchor).toHaveBeenCalledWith('node-1::b', { x: 100, y: 110 }, 'node-1', 'left');
  });
});

const actions = () => {
  const spies = { undo: vi.fn(), redo: vi.fn(), deleteSelection: vi.fn(), copy: vi.fn(), paste: vi.fn(), selectAll: vi.fn(), escape: vi.fn() };
  const typed: CanvasKeyboardActions = spies;
  return Object.assign(spies, { typed });
};

const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));

describe('keyboard shortcuts scoped to the canvas host', () => {
  it('two canvases never interfere and document-level keys reach neither', () => {
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    document.body.replaceChildren(hostA, hostB);
    const a = actions();
    const b = actions();
    bindCanvasKeyboard(hostA, a);
    bindCanvasKeyboard(hostB, b);
    expect(hostA.getAttribute('tabindex')).toBe('0');
    press(hostA, 'z', { ctrlKey: true });
    press(hostB, 'Delete');
    press(document, 'z', { ctrlKey: true });
    expect(a.undo).toHaveBeenCalledTimes(1);
    expect(b.undo).not.toHaveBeenCalled();
    expect(b.deleteSelection).toHaveBeenCalledTimes(1);
    expect(a.deleteSelection).not.toHaveBeenCalled();
  });

  it('maps every advertised shortcut and leaves text inputs alone', () => {
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.appendChild(input);
    const act = actions();
    const unbind = bindCanvasKeyboard(host, act);
    press(host, 'z', { metaKey: true, shiftKey: true });
    press(host, 'y', { ctrlKey: true });
    press(host, 'c', { ctrlKey: true });
    press(host, 'v', { ctrlKey: true });
    press(host, 'a', { ctrlKey: true });
    press(host, 'Backspace');
    press(host, 'Escape');
    press(input, 'Backspace');
    expect([act.redo, act.copy, act.paste, act.selectAll, act.escape].map(f => f.mock.calls.length)).toEqual([2, 1, 1, 1, 1]);
    expect(act.deleteSelection).toHaveBeenCalledTimes(1);
    unbind();
    press(host, 'Escape');
    expect(act.escape).toHaveBeenCalledTimes(1);
  });
});

describe('overlay rendering', () => {
  it('draws and removes the node status layer and animates active edges', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    applyNodeOverlay(node, { status: 'failed', label: 'boom', progress: 0.5 }, { width: 200, height: 80 });
    expect(node.getAttribute('data-run-status')).toBe('failed');
    const layer = node.lastElementChild;
    expect(layer?.getAttribute('data-status')).toBe('failed');
    expect(Array.from(layer?.getElementsByTagName('text') ?? []).map(t => t.textContent)).toEqual(['boom']);
    const bars = Array.from(layer?.getElementsByTagName('rect') ?? []);
    expect(bars[bars.length - 1]?.getAttribute('width')).toBe('100');
    applyNodeOverlay(node, undefined, { width: 200, height: 80 });
    expect(node.children).toHaveLength(0);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    applyEdgeOverlay(path, true);
    expect(path.getAttribute('data-active')).toBe('true');
    applyEdgeOverlay(path, false);
    expect(path.children).toHaveLength(0);
  });
});
