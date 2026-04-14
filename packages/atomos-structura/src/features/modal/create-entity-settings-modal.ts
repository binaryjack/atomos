import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { f } from '@binaryjack/formular.dev'
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js'
import { getToolboxConfig } from '../../core/adapters/toolbox-config-manager.js'
import { createFormularManager } from '../../core/create-formular-manager.js'
import { createSignal } from '@atomos-web/prime'
import { computeContrastColor } from '@atomos-web/prime'
import { createButton } from '@atomos-web/prime'
import { createEntityPropertyRow } from '../entity-with-edges/create-entity-property-row.js'
import { createFormularDropdown } from '@atomos-web/prime'
import { createFormularInput } from '@atomos-web/prime'
import { createFormularTextarea } from '@atomos-web/prime'

import type { ModalOptions } from './types/modal-options.types.js'
import type { ModalResult } from './types/modal-result.types.js'
import type { AtpModal } from '@atomos-web/prime'

export const createEntitySettingsModal = function(entityId: string): AtpModal {
  const adapter = getCanvasAdapter();
  const initialEntity = adapter.getEntity(entityId);
  if (!initialEntity) throw new Error(`Entity ${entityId} not found`);

  const modal = document.createElement('atp-modal') as AtpModal;
  modal.style.setProperty('--atp-modal-width', '480px');

  let isInitialized = false;
  let currentForm: IFormular<IObjectShape> | null = null;
  let fieldCleanups: Array<() => void> = [];

  const formManager = createFormularManager();

  const header = document.createElement('atp-modal-header');
  header.textContent = `Entity Settings`;
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.className = 'flex flex-col gap-4 p-4';

  const footer = Object.assign(document.createElement('div'), { className: 'vbs-toolbar' });
  footer.setAttribute('slot', 'footer');

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  const initializeForm = async (preservedData?: any) => {
    const liveEntity = adapter.getEntity(entityId);
    if (!liveEntity) throw new Error(`Entity ${entityId} not found`);

    header.textContent = `Entity Settings`;

    body.innerHTML = '';
    footer.innerHTML = '';
    fieldCleanups.forEach(fn => fn());
    fieldCleanups = [];

    const toolboxConfig = getToolboxConfig();
    const availableShapes = Array.from(new Set(toolboxConfig.toolsets.flatMap(ts => ts.tools.map(t => t.shape))));
    const shapeOptions = toolboxConfig.toolsets.flatMap(ts => ts.tools.map(t => ({ label: t.name, value: t.shape })));

    // unique options only based on shape
    const uniqueShapeOptions = shapeOptions.filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

    const schemaShape: Record<string, any> = {
      name: f.string().min(1, 'Name is required'),
      description: f.string().optional(),
      shape: f.enum(availableShapes as any).optional(),
      color: f.string().optional()
    };

    const schema = f.object(schemaShape);

    const defaultValues: Record<string, any> = {
      name: preservedData?.name ?? liveEntity.name,
      description: preservedData?.description ?? liveEntity.description ?? '',
      shape: preservedData?.shape ?? liveEntity.shape ?? 'box',
      color: preservedData?.color ?? liveEntity.color ?? '#1c3557'
    };

    const form = await formManager.createFormForModal(modal, {
      schema,
      defaultValues
    });

    currentForm = form as unknown as IFormular<IObjectShape>;

    const nameField = createFormularInput({
      fieldName: 'name',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Entity Name',
      placeholder: 'Enter entity name'
    });

    const descField = createFormularTextarea({
      fieldName: 'description',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Description',
      placeholder: 'Enter entity description'
    });

    const shapeField = createFormularDropdown({
      fieldName: 'shape',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Shape Type',
      options: uniqueShapeOptions
    });

    const colorField = createFormularInput({
      fieldName: 'color',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Background Color',
      type: 'color'
    });

    body.appendChild(nameField.element);
    body.appendChild(descField.element);
    body.appendChild(shapeField.element);
    body.appendChild(colorField.element);
    
    fieldCleanups.push(
      nameField.cleanup.destroy,
      descField.cleanup.destroy,
      shapeField.cleanup.destroy,
      colorField.cleanup.destroy
    );

    // ── Live contrast preview ──────────────────────────────────────────────
    const contrastBar = document.createElement('div');
    contrastBar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:8px',
      'padding:8px 10px', 'border-radius: var(--vbs-radius, 2px)',
      'border:1px solid var(--vbs-bg-panel, #111111)',
      'transition:background 0.15s',
    ].join(';');

    const contrastSwatch = document.createElement('div');
    contrastSwatch.style.cssText = [
      'width:32px', 'height:32px', 'border-radius: var(--vbs-radius, 2px)',
      'border:1px solid var(--vbs-border, #27272a)', 'flex-shrink:0',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-size:11px', 'font-weight:700', 'font-family:monospace',
    ].join(';');

    const contrastInfo = document.createElement('div');
    contrastInfo.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1;';

    const contrastRatioEl = document.createElement('span');
    contrastRatioEl.style.cssText = 'font-size:12px;font-weight:600;';

    const contrastGradeEl = document.createElement('span');
    contrastGradeEl.style.cssText = 'font-size:10px;';

    contrastInfo.appendChild(contrastRatioEl);
    contrastInfo.appendChild(contrastGradeEl);
    contrastBar.appendChild(contrastSwatch);
    contrastBar.appendChild(contrastInfo);
    body.appendChild(contrastBar);

    const updateContrastPreview = (hex: string): void => {
      const c = computeContrastColor(hex || 'var(--vbs-bg-panel, #111111)');
      contrastBar.style.background   = hex || 'var(--vbs-bg-panel, #111111)';
      contrastSwatch.style.background = hex || 'var(--vbs-bg-panel, #111111)';
      contrastSwatch.style.color      = c.textColor;
      contrastSwatch.textContent      = 'Aa';
      contrastRatioEl.style.color     = c.textColor;
      contrastRatioEl.textContent     = `Contrast ${c.ratio.toFixed(2)}:1`;
      contrastGradeEl.style.color     = c.mutedColor;
      const icon = c.grade === 'Fail'     ? '⚠ Fail — text may be unreadable'
                 : c.grade === 'AA Large' ? '◎ AA Large — OK for big text only'
                 : c.grade === 'AA'       ? '✓ AA — good'
                                          : '✓ AAA — excellent';
      contrastGradeEl.textContent = icon;
    };

    updateContrastPreview(String((currentForm.getField('color')?.input as any)?.value ?? liveEntity.color ?? 'var(--vbs-bg-panel, #111111)'));
    const onColorInput = (): void => updateContrastPreview(String((currentForm!.getField('color')?.input as any)?.value ?? 'var(--vbs-bg-panel, #111111)'));
    colorField.element.addEventListener('input', onColorInput);
    fieldCleanups.push(() => colorField.element.removeEventListener('input', onColorInput));
    // ──────────────────────────────────────────────────────────────────────

    const localProperties: any[] = structuredClone(liveEntity.properties as any) || [];

    const propertiesContainer = document.createElement('div');
    propertiesContainer.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
    
    const propHeader = document.createElement('div');
    propHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top: 10px; border-top: 1px solid var(--vbs-border, #27272a); padding-top: 10px;';
    
    const propTitle = document.createElement('h3');
    propTitle.textContent = 'Properties';
    propTitle.style.cssText = 'margin:0; font-size:14px; color:var(--vbs-text-primary, #f4f4f5); font-weight:600;';
    
    const addPropBtn = document.createElement('button');
    addPropBtn.type = 'button';
    addPropBtn.textContent = '+ Add Property';
    addPropBtn.className = 'vbs-btn vbs-btn-primary';
    addPropBtn.style.cssText = 'padding: 4px 8px; font-size: 12px; height: 24px; min-height: 24px;';
    
    propHeader.appendChild(propTitle);
    propHeader.appendChild(addPropBtn);

    const scrollBody = document.createElement('div');
    scrollBody.style.cssText = 'max-height: 200px; overflow-y: auto; overflow-x: hidden; border: 1px solid var(--vbs-border, #27272a); border-radius: var(--vbs-radius, 2px); padding: 4px; display: flex; flex-direction: column; background: var(--vbs-bg-input, #09090b);';
    
    propertiesContainer.appendChild(propHeader);
    propertiesContainer.appendChild(scrollBody);
    body.appendChild(propertiesContainer);

    const renderLocalProperties = () => {
      scrollBody.innerHTML = '';
      localProperties.forEach((prop, index) => {
        const propLabelSignal         = createSignal(prop.label || prop.key);
        const propTypeSignal          = createSignal<any>(prop.dataType);
        const propComponentTypeSignal = createSignal<any>(prop.componentType ?? 'input');
        const propValueSignal         = createSignal<unknown>(prop.value ?? '');

        const rowEl = createEntityPropertyRow({
          id: prop.key,
          label: propLabelSignal,
          dataType: propTypeSignal,
          componentType: propComponentTypeSignal,
          value: propValueSignal,
          availableDataTypes: ['string', 'number', 'boolean', 'integer', 'float', 'datetime', 'select', 'reference'] as any[],
          onLabelChange: (v) => { prop.label = v; },
          onDataTypeChange: (v) => { prop.dataType = v; },
          onComponentTypeChange: (v) => { prop.componentType = v; },
          onValueChange: (v) => { prop.value = v; },
          onSettingsClick: () => { /* no-op in simple settings modal for now */ },
          onDeleteClick: () => {
             localProperties.splice(index, 1);
             renderLocalProperties();
          }
        });
        scrollBody.appendChild(rowEl.element);
      });
    };

    addPropBtn.addEventListener('click', () => {
       const key = `prop_${Date.now()}`;
       localProperties.push({
         key,
         label: 'New Property',
         dataType: 'string',
         value: ''
       } as any);
       renderLocalProperties();
       setTimeout(() => {
         scrollBody.scrollTop = scrollBody.scrollHeight;
       }, 0);
    });

    renderLocalProperties();

    const cancelBtn = createButton({
      variant: 'ghost',
      size: 'md',
      children: 'Cancel',
      onClick: () => {
        modal.close();
      }
    });

    const saveBtn = createButton({
      variant: 'primary',
      size: 'md',
      children: 'Save',
      onClick: async () => {
        if (!currentForm) return;

        try {
          await currentForm.validateForm();
        } catch (err) {
          console.warn('Validation error:', err);
        }

        let data: any = {};
        try {
          data = currentForm.getData() || {};
        } catch (err) {
          console.error('Error getting form data:', err);
        }

        const finalName   = String(data.name        ?? liveEntity.name        ?? '');
        const description  = String(data.description ?? liveEntity.description ?? '');
        const shape        = String(data.shape       ?? liveEntity.shape       ?? 'box');
        const color        = String(data.color       ?? liveEntity.color       ?? '');

        adapter.updateEntityMetadata(entityId, { name: finalName, description, shape, color });
        
        adapter.updateEntityProperties(entityId, localProperties);

        modal.close();
      }
    });

    footer.appendChild(cancelBtn.element);
    footer.appendChild(saveBtn.element);
  };

  const originalOpen = modal.open.bind(modal);
  modal.open = async function<T = void>(options?: ModalOptions<T>): Promise<ModalResult<T>> {
    if (!isInitialized) {
      try {
        await initializeForm();
        isInitialized = true;
      } catch (error) {
        console.error('Failed to init form:', error);
        body.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;"><p>Failed to initialize form</p></div>`;
      }
    }

    if (!modal.parentElement) {
      document.body.appendChild(modal);
    }
    return originalOpen(options);
  };

  modal.addEventListener('atp-modal-closed', () => {
    formManager.cleanupModal(modal);
    fieldCleanups.forEach(fn => fn());
    fieldCleanups = [];
    isInitialized = false;
    currentForm = null;
    if (modal.parentElement) {
      modal.parentElement.removeChild(modal);
    }
  });

  document.body.appendChild(modal);
  return modal;
};

