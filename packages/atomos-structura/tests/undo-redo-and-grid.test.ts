// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createGridBackground } from '../src/preview/components/create-grid-background.js';
import { createInstanceReduxStore } from '../src/core/create-redux-store.js';

describe('Undo / Redo & Grid Suppression', () => {
  it('triggers onUndoRedo listener and handles undo/redo stack properly', () => {
    const store = createInstanceReduxStore(undefined, 'test-undo-instance');

    let undoRedoEvent: string | null = null;
    if (store.onUndoRedo) {
      store.onUndoRedo((type) => {
        undoRedoEvent = type;
      });
    }

    const state1 = store.get_state();
    const activeCanvasId = state1.workspace.active_canvas_id;
    const activeSchemaId = state1.workspace.canvases[activeCanvasId]?.active_schema_id || 'schema-default';

    // Dispatch an undoable action
    store.dispatch({
      type: 'entity-added',
      schema_id: activeSchemaId,
      entity: {
        id: 'test-undo-ent-1',
        name: 'Undo Test Entity',
        position: { x: 50, y: 50 },
        dimensions: { width: 120, height: 80 },
        code: 'UndoTestEntity',
        edges: []
      }
    });

    expect(store.can_undo()).toBe(true);

    // Call undo
    store.undo();
    expect(undoRedoEvent).toBe('undo');

    const stateAfterUndo = store.get_state();
    const entitiesAfterUndo = stateAfterUndo.workspace.canvases[activeCanvasId]?.schemas[activeSchemaId]?.entities || [];
    expect(entitiesAfterUndo.some(e => e.id === 'test-undo-ent-1')).toBe(false);

    // Call redo
    expect(store.can_redo()).toBe(true);
    store.redo();
    expect(undoRedoEvent).toBe('redo');

    const stateAfterRedo = store.get_state();
    const entitiesAfterRedo = stateAfterRedo.workspace.canvases[activeCanvasId]?.schemas[activeSchemaId]?.entities || [];
    expect(entitiesAfterRedo.some(e => e.id === 'test-undo-ent-1')).toBe(true);
  });

  it('suppresses grid background when hidden option is true', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const gridEl = createGridBackground(svg, { hidden: true });

    expect(gridEl.style.display).toBe('none');

    const svgVisible = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const gridVisibleEl = createGridBackground(svgVisible, { hidden: false });
    expect(gridVisibleEl.style.display).not.toBe('none');
  });
});
