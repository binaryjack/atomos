import type { Signal } from '@atomos-web/prime'
import { createEditableLabel, createSignal } from '@atomos-web/prime'
import { createSVGShape } from '../../canvas/shape-renderers/create-svg-shape.js';
import type { ComponentType, DataType, Entity } from '@atomos-web/structura-core'
import { createLegacyPropertyRepositoryBridge } from '../../core/adapters/legacy-property-bridge.js'
import type { EntityStore } from '../../core/create-entity-store.js'
import type { IStorageProvider } from '../../core/storage/types/storage-provider.types.js'
import type { GlobalConfig } from '../../core/types/global-config.types.js'
import { createPropertySettingsModal } from '../modal/create-property-settings-modal.js'
import { createEntityFooter } from './create-entity-footer.js'
import { createEntityHeader } from './create-entity-header.js'
import { createEntityPropertyRow } from './create-entity-property-row.js'

const HEADER_H = 36;
const FOOTER_H = 30;
const ROW_H    = 30;
const MIN_BODY_ROWS = 2;

export interface EntityContentProps {
  readonly instanceId: string;
  readonly entityStore: EntityStore;
  readonly globalConfig: Signal<GlobalConfig>;
  readonly storageProvider: IStorageProvider<Entity>;
  readonly onDelete: (entityId: string) => void;
  readonly onSettingsClick: (entityId: string) => void;
  readonly color?: string | undefined;
  readonly shape?: string | undefined;
  /** Called whenever the required height changes so SVG geometry can update */
  readonly onHeightChange: (height: number) => void;
  readonly isReadonly?: boolean;
  readonly executionSignal?: Signal<any>;
}

export interface EntityContentResult {
  readonly rootElement: SVGGElement;
  readonly foreignObject: SVGForeignObjectElement;
  readonly dragHandle: HTMLDivElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly cleanup: { destroy: () => void };
}

export const createEntityContent = function(props: EntityContentProps): EntityContentResult {
  const cleanups: Array<() => void> = [];
  const store = props.entityStore; // Use the store passed in, don't create a new one!

  // ─── root group ────────────────────────────────────────────────────────────
  const rootElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // ─── background shape ──────────────────────────────────────────────────────
  const shapeWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  shapeWrapper.classList.add('sim-telemetry-target');
  rootElement.appendChild(shapeWrapper);

  let currentShape: SVGElement | null = null;
  // We'll update the background shape in updateSize()

  // ─── foreignObject shell ───────────────────────────────────────────────────
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('x', '0');
  fo.setAttribute('y', '0');
  fo.setAttribute('overflow', 'visible');
  
  rootElement.appendChild(fo);

  // body element (required for HTML inside foreignObject)
  const body = document.createElement('div');
  body.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  body.classList.add('vbs-entity-content-body');

  // Inject animation keyframes
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes vbs-exec-glow {
      0% { box-shadow: 0 0 4px 0px #3b82f6, inset 0 0 4px 0px #3b82f6; border-color: #3b82f6; }
      50% { box-shadow: 0 0 15px 4px #60a5fa, inset 0 0 8px 2px #60a5fa; border-color: #93c5fd; }
      100% { box-shadow: 0 0 4px 0px #3b82f6, inset 0 0 4px 0px #3b82f6; border-color: #3b82f6; }
    }
    .vbs-exec-running {
      animation: vbs-exec-glow 2s infinite ease-in-out;
    }
    .vbs-exec-success {
      border-color: #22c55e !important;
      box-shadow: 0 0 10px 0px rgba(34, 197, 94, 0.4) !important;
    }
    .vbs-exec-failed {
      border-color: #ef4444 !important;
      box-shadow: 0 0 10px 0px rgba(239, 68, 68, 0.4) !important;
    }
    .vbs-exec-warning {
      border-color: #eab308 !important;
      box-shadow: 0 0 10px 0px rgba(234, 179, 8, 0.4) !important;
    }
  `;
  body.appendChild(styleTag);

  fo.appendChild(body);

  // ─── header ───────────────────────────────────────────────────────────────
  const labelSignal = createSignal(store.signal.value.name);
  const isCollapsedSignal = createSignal(store.signal.value.collapsed ?? false);
  const hasNoPropertiesSignal = createSignal(store.signal.value.properties.length === 0);

  const header = createEntityHeader({
    color: undefined,
    label: labelSignal,
    isCollapsed: isCollapsedSignal,
    hasNoProperties: hasNoPropertiesSignal,
    isReadonly: !!props.isReadonly,
    onLabelChange: (v) => {
      store.updateLabel(v);
    },
    onToggleCollapse: () => {
      const currentState = store.signal.value.collapsed ?? false;
      store.updateCollapse(!currentState);
    },
    onSettingsClick: () => {
      props.onSettingsClick(store.signal.value.id);
    },
    onDeleteClick:   () => props.onDelete(store.signal.value.id),
  });
  cleanups.push(header.cleanup.destroy);
  header.element.style.position = 'relative';
  body.appendChild(header.element);

  // Execution Progress Bar
  const progressBar = document.createElement('div');
  progressBar.classList.add('vbs-exec-progress');
  header.element.appendChild(progressBar);

  // Floating Status Badge
  const statusBadge = document.createElement('div');
  statusBadge.classList.add('vbs-status-badge');
  
  // We append statusBadge to `body` so it can break out of the header bounds, 
  // but wait `overflow:hidden` is on `body`. We should put it on `fo`? No, foreignObject doesn't support overflow visible easily in all browsers. 
  // We will append it to `body` and remove `overflow:hidden` from `body` if possible, or just place it inside.
  body.style.overflow = 'visible'; 
  body.appendChild(statusBadge);

  if (props.executionSignal) {
    const unsubExec = props.executionSignal.subscribe((exec) => {
      // 1. Frame glow
      body.classList.remove('vbs-exec-running', 'vbs-exec-success', 'vbs-exec-failed', 'vbs-exec-warning');
      if (exec.status === 'running') body.classList.add('vbs-exec-running');
      if (exec.status === 'success') body.classList.add('vbs-exec-success');
      if (exec.status === 'failed') body.classList.add('vbs-exec-failed');
      if (exec.status === 'warning') body.classList.add('vbs-exec-warning');

      // 2. Progress Bar
      if (exec.progress !== undefined) {
        progressBar.style.width = `${Math.max(0, Math.min(100, exec.progress))}%`;
        progressBar.style.opacity = '1';
      } else {
        progressBar.style.opacity = '0';
      }

      // 3. Status Badge
      if (exec.status === 'success') {
        statusBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
        statusBadge.style.background = '#22c55e';
        statusBadge.style.opacity = '1';
        statusBadge.style.transform = 'scale(1)';
      } else if (exec.status === 'failed') {
        statusBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';
        statusBadge.style.background = '#ef4444';
        statusBadge.style.opacity = '1';
        statusBadge.style.transform = 'scale(1)';
      } else if (exec.status === 'warning') {
        statusBadge.innerHTML = '<span style="font-weight:bold;line-height:0">!</span>';
        statusBadge.style.background = '#eab308';
        statusBadge.style.opacity = '1';
        statusBadge.style.transform = 'scale(1)';
      } else {
        statusBadge.style.opacity = '0';
        statusBadge.style.transform = 'scale(0.8)';
      }
    });
    cleanups.push(unsubExec);
  }

  // ─── scrollable body ──────────────────────────────────────────────────────
  const scrollBody = document.createElement('div');
  scrollBody.classList.add('vbs-scroll-body');
  scrollBody.style.display = 'flex';
  scrollBody.style.flexDirection = 'column';
  scrollBody.style.height = '100%';
  body.appendChild(scrollBody);

  // ─── State 2: Big Centered Title (when 0 properties) ─────────────────────
  const emptyTitleContainer = document.createElement('div');
  emptyTitleContainer.classList.add('vbs-empty-entity-title');
  emptyTitleContainer.style.flex = '1';
  emptyTitleContainer.style.width = '100%';
  emptyTitleContainer.style.height = '100%';
  emptyTitleContainer.style.minHeight = '60px';
  emptyTitleContainer.style.display = 'none';
  emptyTitleContainer.style.alignItems = 'center';
  emptyTitleContainer.style.justifyContent = 'center';
  emptyTitleContainer.style.textAlign = 'center';
  emptyTitleContainer.style.padding = '12px 16px';
  emptyTitleContainer.style.boxSizing = 'border-box';

  const emptyTitleLabel = createEditableLabel({
    value: labelSignal,
    placeholder: 'Entity name',
    className: '',
    inputClassName: '',
    onChange: (v) => store.updateLabel(v),
  });
  emptyTitleLabel.element.style.color = 'var(--vbs-entity-text-color, #ffffff)';
  emptyTitleLabel.element.style.fontFamily = 'var(--vbs-entity-name-font-family, system-ui, sans-serif)';
  emptyTitleLabel.element.style.fontSize = '16px';
  emptyTitleLabel.element.style.fontWeight = 'bold';
  emptyTitleLabel.element.style.textAlign = 'center';
  emptyTitleLabel.element.style.width = '100%';
  if (props.isReadonly) {
    emptyTitleLabel.element.style.pointerEvents = 'none';
  }
  emptyTitleContainer.appendChild(emptyTitleLabel.element);
  cleanups.push(emptyTitleLabel.cleanup.destroy);

  // ─── State 3: Group SVG Print (Meta-canvas) ───────────────────────────────
  const groupSvgContainer = document.createElement('div');
  groupSvgContainer.classList.add('vbs-group-svg-container');
  groupSvgContainer.style.display = 'none';
  groupSvgContainer.style.width = '100%';
  groupSvgContainer.style.height = '100%';
  groupSvgContainer.style.padding = '8px';
  groupSvgContainer.style.boxSizing = 'border-box';
  groupSvgContainer.style.alignItems = 'center';
  groupSvgContainer.style.justifyContent = 'center';

  scrollBody.appendChild(emptyTitleContainer);
  scrollBody.appendChild(groupSvgContainer);

  // Track existing rows by property key
  const rowCache = new Map<string, {
    labelSignal: Signal<string>;
    typeSignal: Signal<DataType>;
    componentTypeSignal: Signal<ComponentType>;
    valueSignal: Signal<unknown>;
    element: HTMLDivElement;
    cleanup: () => void;
  }>();

  const renderRows = (entity: Entity): void => {
    const isGroup = (entity as any).isGroup || (entity.metadata as any)?.isGroup || false;
    const svgPrint = (entity as any).svgPrint || (entity as any).svgContent || (entity.metadata as any)?.svgPrint || (entity.metadata as any)?.svgContent || null;
    const hasProperties = entity.properties.length > 0;

    const noProps = !hasProperties;
    const isGroupSvgState = isGroup && !!svgPrint;

    hasNoPropertiesSignal.set(noProps || isGroupSvgState);

    if (isGroupSvgState) {
      // State 3: Group SVG Print
      groupSvgContainer.innerHTML = svgPrint;
      groupSvgContainer.style.display = 'flex';
      emptyTitleContainer.style.display = 'none';
      if (footer.element) footer.element.style.display = 'none';
    } else if (noProps) {
      // State 2: No properties -> Big centered title
      groupSvgContainer.style.display = 'none';
      emptyTitleContainer.style.display = 'flex';
      if (footer.element) footer.element.style.display = 'none';
    } else {
      // State 1: Has properties -> Standard property rows
      groupSvgContainer.style.display = 'none';
      emptyTitleContainer.style.display = 'none';
      if (footer.element) footer.element.style.display = entity.collapsed ? 'none' : 'flex';
    }
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
        if (existing.componentTypeSignal.value !== prop.componentType) {
          existing.componentTypeSignal.set(prop.componentType);
        }
        if (existing.valueSignal.value !== prop.value) {
          existing.valueSignal.set(prop.value);
        }
        
        // Ensure DOM order matches property array order
        if (scrollBody.children[index] !== existing.element) {
          scrollBody.insertBefore(existing.element, scrollBody.children[index] || null);
        }
      } else {
        // Create new row
        const propLabelSignal         = createSignal(prop.label);
        const propTypeSignal          = createSignal<DataType>(prop.dataType);
        const propComponentTypeSignal = createSignal<ComponentType>(prop.componentType);
        const propValueSignal         = createSignal<unknown>(prop.value);

        const rowEl = createEntityPropertyRow({
          id: prop.key,
          label: propLabelSignal,
          dataType: propTypeSignal,
          componentType: propComponentTypeSignal,
          value: propValueSignal,
          isReadonly: !!props.isReadonly,
          required: !!prop.validation?.required,
          availableDataTypes: props.globalConfig.value.dataTypes,
          onLabelChange: (v) => {
            propLabelSignal.set(v);
            const repository = createLegacyPropertyRepositoryBridge({
              instanceId: props.instanceId,
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });
            repository.update(prop.key, { label: v }).catch(console.error);
          },
          onDataTypeChange: (v) => {
            propTypeSignal.set(v);
            const repository = createLegacyPropertyRepositoryBridge({
              instanceId: props.instanceId,
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });
            repository.update(prop.key, { dataType: v }).catch(console.error);
          },
          onComponentTypeChange: (v) => {
            propComponentTypeSignal.set(v);
            const repository = createLegacyPropertyRepositoryBridge({
              instanceId: props.instanceId,
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });
            repository.update(prop.key, { componentType: v }).catch(console.error);
          },
          onValueChange: (v) => {
            propValueSignal.set(v);
            const repository = createLegacyPropertyRepositoryBridge({
              instanceId: props.instanceId,
              entityId: store.signal.value.id,
              entitySignal: store.signal,
              storageProvider: props.storageProvider
            });
            repository.update(prop.key, { value: v }).catch(console.error);
          },
          onSettingsClick: () => {
            const propModal = createPropertySettingsModal({
              instanceId: props.instanceId,
              entityId: store.signal.value.id,
              propertyKey: prop.key,
            });
            propModal.open().catch(console.error);
          },
          onDeleteClick: async () => {
            console.log(`[ENTITY-CONTENT] Deleting property ${prop.key} via clean architecture bridge...`);
            const repository = createLegacyPropertyRepositoryBridge({
              instanceId: props.instanceId,
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
          componentTypeSignal: propComponentTypeSignal,
          valueSignal: propValueSignal,
          element: rowEl.element,
          cleanup: rowEl.cleanup.destroy
        });
      }
    });

    recalcHeight(entity);
  };

  const recalcHeight = (entity: Entity): void => {
    if (entity.collapsed) {
      props.onHeightChange(HEADER_H);
      return;
    }
    const bodyRows = Math.max(entity.properties.length, MIN_BODY_ROWS);
    const total = HEADER_H + bodyRows * ROW_H + FOOTER_H;
    props.onHeightChange(total);
  };

  // ─── footer ───────────────────────────────────────────────────────────────
  const footer = createEntityFooter({
    color: undefined,
    isReadonly: !!props.isReadonly,
    onAddProperty: async () => {
      console.log('[ENTITY-CONTENT] Adding new property via clean architecture bridge...');
      const repository = createLegacyPropertyRepositoryBridge({
        instanceId: props.instanceId,
        entityId: store.signal.value.id,
        entitySignal: store.signal,
        storageProvider: props.storageProvider
      });
      
      try {
        const newProp = await repository.create({
          key: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

  // Initial render
  renderRows(store.signal.value);
  if (store.signal.value.collapsed) {
    scrollBody.style.display = 'none';
    footer.element.style.display = 'none';
  } else {
    scrollBody.style.display = '';
    footer.element.style.display = 'flex';
  }

  // Re-render on store change
  const unsubStore = store.signal.subscribe((entity) => {
    if (labelSignal.value !== entity.name) {
      labelSignal.set(entity.name);
    }
    const isCollapsed = entity.collapsed ?? false;
    if (isCollapsedSignal.value !== isCollapsed) {
      isCollapsedSignal.set(isCollapsed);
      if (isCollapsed) {
        scrollBody.style.display = 'none';
        footer.element.style.display = 'none';
      } else {
        scrollBody.style.display = '';
        footer.element.style.display = 'flex';
      }
      recalcHeight(entity);
    }
    renderRows(entity);
  });

  const updateSize = (width: number, height: number): void => {
    fo.setAttribute('width',  width.toString());
    fo.setAttribute('height', height.toString());
    body.style.width  = `${width}px`;
    body.style.height = `${height}px`;
    
    // Dynamically update background shape
    if (currentShape && currentShape.parentNode) {
      currentShape.parentNode.removeChild(currentShape);
    }
    currentShape = createSVGShape((props.shape || 'rectangle') as any, width, height, undefined);
    shapeWrapper.appendChild(currentShape);
  };

  return {
    rootElement,
    foreignObject: fo,
    dragHandle: body,
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
