import type { Signal } from '../../core/types/signal.types.js';
import type { Entity, Property, DataType } from '@vbs/vbs-mod';
import type { GlobalConfig } from '../../core/types/global-config.types.js';
import type { IStorageProvider } from '../../core/storage/types/storage-provider.types.js';
import { createSignal } from '../../core/create-signal.js';
import { createEntityStore } from '../../core/create-entity-store.js';
import { createEntityHeader } from './create-entity-header.js';
import { createEntityPropertyRow } from './create-entity-property-row.js';
import { createEntityFooter } from './create-entity-footer.js';
import { createEntitySettingsModal } from '../modal/create-entity-settings-modal.js';
import { createPropertySettingsModal } from '../modal/create-property-settings-modal.js';

const HEADER_H = 36;
const FOOTER_H = 30;
const ROW_H    = 30;
const MIN_BODY_ROWS = 2;

export interface EntityContentProps {
  readonly entitySignal: Signal<Entity>;
  readonly globalConfig: Signal<GlobalConfig>;
  readonly storageProvider: IStorageProvider<Entity>;
  readonly onDelete: (entityId: string) => void;
  readonly onSettingsClick: (entityId: string) => void;
  /** Called whenever the required height changes so SVG geometry can update */
  readonly onHeightChange: (height: number) => void;
}

export interface EntityContentResult {
  readonly foreignObject: SVGForeignObjectElement;
  readonly dragHandle: HTMLDivElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly cleanup: { destroy: () => void };
}

export const createEntityContent = function(props: EntityContentProps): EntityContentResult {
  const cleanups: Array<() => void> = [];
  const store = createEntityStore(props.entitySignal.value);
  const entitySettingsModal = createEntitySettingsModal(props.entitySignal.value.id);

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
    'color:#e2e8f0',
  ].join(';');

  fo.appendChild(body);

  // ─── header ───────────────────────────────────────────────────────────────
  const labelSignal = createSignal(props.entitySignal.value.name);

  const header = createEntityHeader({
    label: labelSignal,
    onLabelChange: (v) => {
      store.updateLabel(v);
    },
    onSettingsClick: () => {
      props.onSettingsClick(props.entitySignal.value.id);
      entitySettingsModal.open().catch(console.error);
    },
    onDeleteClick:   () => props.onDelete(props.entitySignal.value.id),
  });
  cleanups.push(header.cleanup.destroy);
  body.appendChild(header.element);

  // ─── scrollable body ──────────────────────────────────────────────────────
  const scrollBody = document.createElement('div');
  scrollBody.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;';
  body.appendChild(scrollBody);

  // Track row cleanup fns by property key
  const propCleanups = new Map<string, () => void>();

  const renderRows = (entity: Entity): void => {
    // Clear existing
    propCleanups.forEach(fn => fn());
    propCleanups.clear();
    scrollBody.innerHTML = '';

    entity.properties.forEach((prop) => {
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
            properties: updated.properties.map(p =>
              p.key === prop.key ? { ...p, label: v } : p
            )
          });
        },
        onDataTypeChange: (v) => {
          propTypeSignal.set(v);
          const updated = store.signal.value;
          store.signal.set({
            ...updated,
            properties: updated.properties.map(p =>
              p.key === prop.key ? { ...p, dataType: v } : p
            )
          });
        },
        onSettingsClick: () => {
          const propModal = createPropertySettingsModal({
            property: prop,
            entityStore: store,
            storageProvider: props.storageProvider,
          });
          propModal.open().catch(console.error);
        },
        onDeleteClick: () => store.removeProperty(prop.key),
      });

      propCleanups.set(prop.key, rowEl.cleanup.destroy);
      scrollBody.appendChild(rowEl.element);
    });

    recalcHeight(entity);
  };

  const recalcHeight = (entity: Entity): void => {
    const bodyRows = Math.max(entity.properties.length, MIN_BODY_ROWS);
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
      const newProp: Property = {
        key: `prop-${Date.now()}`,
        label: 'new property',
        value: undefined,
        dataType: 'string',
        componentType: 'input',
      };
      store.addProperty(newProp);
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
    dragHandle: header.element,
    updateSize,
    cleanup: {
      destroy: () => {
        propCleanups.forEach(fn => fn());
        propCleanups.clear();
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
        if (entitySettingsModal.parentNode) entitySettingsModal.parentNode.removeChild(entitySettingsModal);
      }
    }
  };
};
