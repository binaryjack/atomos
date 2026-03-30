import type { DataType, Entity } from '@vbs/vbs-mod'
import { createLegacyPropertyRepositoryBridge } from '../../core/adapters/legacy-property-bridge.js'
import type { EntityStore } from '../../core/create-entity-store.js'
import { createSignal } from '../../core/create-signal.js'
import type { IStorageProvider } from '../../core/storage/types/storage-provider.types.js'
import type { GlobalConfig } from '../../core/types/global-config.types.js'
import type { Signal } from '../../core/types/signal.types.js'
import { createEntitySettingsModal } from '../modal/create-entity-settings-modal.js'
import { createPropertySettingsModal } from '../modal/create-property-settings-modal.js'
import { createEntityFooter } from './create-entity-footer.js'
import { createEntityHeader } from './create-entity-header.js'
import { createEntityPropertyRow } from './create-entity-property-row.js'

const HEADER_H = 36;
const FOOTER_H = 30;
const ROW_H    = 30;
const MIN_BODY_ROWS = 2;

export interface EntityContentProps {
  readonly entityStore: EntityStore;
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
  const store = props.entityStore; // Use the store passed in, don't create a new one!
  const entitySettingsModal = createEntitySettingsModal(props.entityStore.signal.value.id);

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
  const labelSignal = createSignal(store.signal.value.name);

  const header = createEntityHeader({
    label: labelSignal,
    onLabelChange: (v) => {
      store.updateLabel(v);
    },
    onSettingsClick: () => {
      props.onSettingsClick(store.signal.value.id);
      entitySettingsModal.open().catch(console.error);
    },
    onDeleteClick:   () => props.onDelete(store.signal.value.id),
  });
  cleanups.push(header.cleanup.destroy);
  body.appendChild(header.element);

  // ─── scrollable body ──────────────────────────────────────────────────────
  const scrollBody = document.createElement('div');
  scrollBody.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;';
  body.appendChild(scrollBody);

// Track existing rows by property key
  const rowCache = new Map<string, {
    labelSignal: Signal<string>;
    typeSignal: Signal<DataType>;
    element: HTMLDivElement;
    cleanup: () => void;
  }>();

  const renderRows = (entity: Entity): void => {
    const nextPropKeys = new Set(entity.properties.map(p => p.key));

    // 1. Remove rows that are no longer in the entity
    for (const [key, cached] of rowCache.entries()) {
      if (!nextPropKeys.has(key)) {
        cached.cleanup();
        if (cached.element.parentNode) {
          cached.element.parentNode.removeChild(cached.element);
        }
        rowCache.delete(key);
      }
    }

    // 2. Add or update rows
    entity.properties.forEach((prop, index) => {
      const existing = rowCache.get(prop.key);
      
      if (existing) {
        // Update signals in place without destroying DOM node!
        if (existing.labelSignal.value !== prop.label) {
          existing.labelSignal.set(prop.label);
        }
        if (existing.typeSignal.value !== prop.dataType) {
          existing.typeSignal.set(prop.dataType);
        }
        
        // Ensure DOM order matches property array order
        if (scrollBody.children[index] !== existing.element) {
          scrollBody.insertBefore(existing.element, scrollBody.children[index] || null);
        }
      } else {
        // Create new row
        const propLabelSignal = createSignal(prop.label);
        const propTypeSignal  = createSignal<DataType>(prop.dataType);

        const rowEl = createEntityPropertyRow({
          id: prop.key,
          label: propLabelSignal,
          dataType: propTypeSignal,
          availableDataTypes: props.globalConfig.value.dataTypes,
          onLabelChange: (v) => {
            propLabelSignal.set(v);
            const updated = store.signal.value;
            // IMPORTANT: Since we update Clean Architecture directly, 
            // do NOT just set the local signal, we must persist!
            const repository = createLegacyPropertyRepositoryBridge({
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });
            repository.update(prop.key, { label: v }).catch(console.error);
          },
          onDataTypeChange: (v) => {
            propTypeSignal.set(v);
            const repository = createLegacyPropertyRepositoryBridge({
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });
            repository.update(prop.key, { dataType: v }).catch(console.error);
          },
          onSettingsClick: () => {
            const propModal = createPropertySettingsModal({
              entityId: store.signal.value.id,
              propertyKey: prop.key,
            });
            propModal.open().catch(console.error);
          },
          onDeleteClick: async () => {
            console.log(`[ENTITY-CONTENT] Deleting property ${prop.key} via clean architecture bridge...`);
            const repository = createLegacyPropertyRepositoryBridge({
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });

            try {
              await repository.delete(prop.key);
              console.log(`[ENTITY-CONTENT] ✓ Property ${prop.key} deleted and persisted`);
            } catch (err) {
              console.error(`[ENTITY-CONTENT] ✗ Failed to delete property ${prop.key}:`, err);
            }
          },
        });

        if (scrollBody.children[index]) {
          scrollBody.insertBefore(rowEl.element, scrollBody.children[index] || null);
        } else {
          scrollBody.appendChild(rowEl.element);
        }

        rowCache.set(prop.key, {
          labelSignal: propLabelSignal,
          typeSignal: propTypeSignal,
          element: rowEl.element,
          cleanup: rowEl.cleanup.destroy
        });
      }
    });

    recalcHeight(entity);
  };

  const recalcHeight = (entity: Entity): void => {
    const bodyRows = Math.max(entity.properties.length, MIN_BODY_ROWS);
    const total = HEADER_H + bodyRows * ROW_H + FOOTER_H;
    props.onHeightChange(total);
  };

  // Initial render
  renderRows(store.signal.value);

  // Re-render on store change
  const unsubStore = store.signal.subscribe((entity) => {
    if (labelSignal.value !== entity.name) {
      labelSignal.set(entity.name);
    }
    renderRows(entity);
  });

  // ─── footer ───────────────────────────────────────────────────────────────
  const footer = createEntityFooter({
    onAddProperty: async () => {
      console.log('[ENTITY-CONTENT] Adding new property via clean architecture bridge...');
      const repository = createLegacyPropertyRepositoryBridge({
        entityId: store.signal.value.id,
        entitySignal: store.signal,
        storageProvider: props.storageProvider
      });
      
      try {
        const newProp = await repository.create({
          key: `prop-${Date.now()}`,
          label: 'new property',
          dataType: 'string',
          componentType: 'input',
        });
        console.log('[ENTITY-CONTENT] ✓ Property added and persisted:', newProp.key);
      } catch (err) {
        console.error('[ENTITY-CONTENT] ✗ Failed to add property:', err);
      }
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
          for (const cached of rowCache.values()) {
            cached.cleanup();
          }
          rowCache.clear();
      }
    }
  };
};
