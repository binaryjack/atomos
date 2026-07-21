import { computeContrastColor, createButton, createFormularDropdown, createFormularInput, createFormularTextarea, createSignal } from '@atomos-web/prime'
import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { f } from '@binaryjack/formular.dev'
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js'
import { getToolboxConfig } from '../../core/adapters/toolbox-config-manager.js'
import { createFormularManager } from '../../core/create-formular-manager.js'
import { createEntityPropertyRow } from '../entity-with-edges/create-entity-property-row.js'

import type { AtpModal } from '@atomos-web/prime'
import type { ModalOptions } from './types/modal-options.types.js'
import type { ModalResult } from './types/modal-result.types.js'

export const createEntitySettingsModal = function(instanceId: string, entityId: string): AtpModal {
  const adapter = getCanvasAdapter(instanceId);
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
      form: form as any,
      label: 'Entity Name',
      placeholder: 'Enter entity name'
    });

    const descField = createFormularTextarea({
      fieldName: 'description',
      form: form as any,
      label: 'Description',
      placeholder: 'Enter entity description'
    });

    const shapeField = createFormularDropdown({
      fieldName: 'shape',
      form: form as any,
      label: 'Shape Type',
      options: uniqueShapeOptions
    });

    const colorField = createFormularInput({
      fieldName: 'color',
      form: form as any,
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
    contrastBar.classList.add('vbs-contrast-bar');

    const contrastSwatch = document.createElement('div');
    contrastSwatch.classList.add('vbs-contrast-swatch');

    const contrastInfo = document.createElement('div');
    contrastInfo.classList.add('vbs-contrast-info');

    const contrastRatioEl = document.createElement('span');
    contrastRatioEl.classList.add('vbs-contrast-ratio');

    const contrastGradeEl = document.createElement('span');
    contrastGradeEl.classList.add('vbs-contrast-grade');

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
    propertiesContainer.classList.add('vbs-modal-properties-container');
    
    const propHeader = document.createElement('div');
    propHeader.classList.add('vbs-modal-properties-header');
    
    const propTitle = document.createElement('h3');
    propTitle.textContent = 'Properties';
    propTitle.classList.add('vbs-modal-properties-title');
    
    const addPropBtn = document.createElement('button');
    addPropBtn.type = 'button';
    addPropBtn.textContent = '+ Add Property';
    addPropBtn.classList.add('vbs-btn', 'vbs-btn-primary', 'vbs-modal-add-prop-btn');
    
    propHeader.appendChild(propTitle);
    propHeader.appendChild(addPropBtn);

    const scrollBody = document.createElement('div');
    scrollBody.classList.add('vbs-modal-properties-scroll');
    
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

