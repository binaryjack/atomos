import type { Signal } from '../../core/types/signal.types.js';
import type { EntityProps, DataType } from '@vbs/vbs-mod';
import type { GlobalConfig } from '../../core/types/global-config.types.js';
import { createSignal } from '../../core/create-signal.js';
import { createEntityStore } from '../../core/create-entity-store.js';
import { createEntityHeader } from './create-entity-header.js';
import { createEntityPropertyRow } from './create-entity-property-row.js';
import { createEntityFooter } from './create-entity-footer.js';

const HEADER_H = 36;
const FOOTER_H = 30;
const ROW_H    = 30;
const MIN_BODY_ROWS = 2;

export interface EntityContentProps {
  readonly entitySignal: Signal<EntityProps>;
  readonly globalConfig: Signal<GlobalConfig>;
  readonly onDelete: (entityId: string) => void;
  readonly onSettingsClick: (entityId: string) => void;
  /** Called whenever the required height changes so SVG geometry can update */
  readonly onHeightChange: (height: number) => void;
}

export interface EntityContentResult {
  readonly foreignObject: SVGForeignObjectElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly cleanup: { destroy: () => void };
}

export const createEntityContent = function(props: EntityContentProps): EntityContentResult {
  const cleanups: Array<() => void> = [];
  const store = createEntityStore(props.entitySignal.value);

  // ─── foreignObject shell ───────────────────────────────────────────────────
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('x', '0');
  fo.setAttribute('y', '0');
  fo.setAttribute('overflow', 'visible');

  // body element (required for HTML inside foreignObject)
  const body = document.createElement('div');
  body.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  body.style.cssText = [
    'display:flex', 'flex-direction:column',
    'width:100%', 'height:100%',
    'overflow:hidden',
    'border-radius:6px',
    'background:#0f172a',
    'border:1.5px solid #334155',
    'box-sizing:border-box',
    'font-family:system-ui,sans-serif',
  ].join(';');

  fo.appendChild(body);

  // ─── header ───────────────────────────────────────────────────────────────
  const labelSignal = createSignal(props.entitySignal.value.name);

  const header = createEntityHeader({
    label: labelSignal,
    onLabelChange: (v) => {
      store.updateLabel(v);
    },
    onSettingsClick: () => props.onSettingsClick(props.entitySignal.value.id),
    onDeleteClick:   () => props.onDelete(props.entitySignal.value.id),
  });
  cleanups.push(header.cleanup.destroy);
  body.appendChild(header.element);

  // ─── scrollable body ──────────────────────────────────────────────────────
  const scrollBody = document.createElement('div');
  scrollBody.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;';
  body.appendChild(scrollBody);

  // Track row cleanup fns by row id
  const rowCleanups = new Map<string, () => void>();

  const renderRows = (entity: EntityProps): void => {
    // Clear existing
    rowCleanups.forEach(fn => fn());
    rowCleanups.clear();
    scrollBody.innerHTML = '';

    entity.propertiesRows.forEach(row => {
      row.properties.forEach(prop => {
        const propLabelSignal = createSignal(prop.label);
        const propTypeSignal  = createSignal<DataType>(prop.dataType);

        const rowEl = createEntityPropertyRow({
          id: prop.key,
          label: propLabelSignal,
          dataType: propTypeSignal,
          availableDataTypes: props.globalConfig.value.dataTypes,
          onLabelChange: (v) => {
            propLabelSignal.set(v);
            // Persist back into entity store — replace matching property
            const updated = store.signal.value;
            store.signal.set({
              ...updated,
              propertiesRows: updated.propertiesRows.map(r => ({
                ...r,
                properties: r.properties.map(p =>
                  p.key === prop.key ? { ...p, label: v } : p
                )
              }))
            });
          },
          onDataTypeChange: (v) => {
            propTypeSignal.set(v);
            const updated = store.signal.value;
            store.signal.set({
              ...updated,
              propertiesRows: updated.propertiesRows.map(r => ({
                ...r,
                properties: r.properties.map(p =>
                  p.key === prop.key ? { ...p, dataType: v } : p
                )
              }))
            });
          },
          onSettingsClick: () => {},
          onDeleteClick: () => store.removeProperty(row.id),
        });

        rowCleanups.set(`${row.id}-${prop.key}`, rowEl.cleanup.destroy);
        scrollBody.appendChild(rowEl.element);
      });
    });

    recalcHeight(entity);
  };

  const recalcHeight = (entity: EntityProps): void => {
    const rowCount = entity.propertiesRows.reduce(
      (acc, r) => acc + r.properties.length, 0
    );
    const bodyRows = Math.max(rowCount, MIN_BODY_ROWS);
    const total = HEADER_H + bodyRows * ROW_H + FOOTER_H;
    props.onHeightChange(total);
  };

  // Initial render
  renderRows(props.entitySignal.value);

  // Re-render on store change
  const unsubStore = store.signal.subscribe((entity) => renderRows(entity));
  cleanups.push(unsubStore);

  // ─── footer ───────────────────────────────────────────────────────────────
  const footer = createEntityFooter({
    onAddProperty: () => {
      const entity = store.signal.value;
      const newProp = {
        key: `prop-${Date.now()}`,
        label: 'new property',
        value: undefined,
        dataType: 'string' as DataType,
        componentType: 'input' as const,
        schema: {} as never,
      };
      store.addProperty({
        id: `row-${Date.now()}`,
        properties: [newProp],
        order: entity.propertiesRows.length + 1,
      });
    },
  });
  cleanups.push(footer.cleanup.destroy);
  body.appendChild(footer.element);

  const updateSize = (width: number, height: number): void => {
    fo.setAttribute('width',  width.toString());
    fo.setAttribute('height', height.toString());
    body.style.width  = `${width}px`;
    body.style.height = `${height}px`;
  };

  return {
    foreignObject: fo,
    updateSize,
    cleanup: {
      destroy: () => {
        rowCleanups.forEach(fn => fn());
        rowCleanups.clear();
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      }
    }
  };
};
