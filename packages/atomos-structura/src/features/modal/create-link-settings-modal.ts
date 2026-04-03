import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js';
import { createButton } from '@atomos/prime';

import type { AtpModal } from '@atomos/prime';

const modalCache = new Map<string, AtpModal>();

export const openLinkSettingsModal = function(linkId: string): void {
  // Always recreate the modal to get fresh link data
  let modal = modalCache.get(linkId);
  if (modal) {
    modal.remove();
    modalCache.delete(linkId);
  }

  const canvasAdapter = getCanvasAdapter();
  const link = canvasAdapter.getLink(linkId);
  if (!link) {
    console.error(`Link ${linkId} not found`);
    return;
  }

  const sourceEntity = canvasAdapter.getEntity(link.sourceEntityId);
  const targetEntity = canvasAdapter.getEntity(link.targetEntityId);

  if (!sourceEntity || !targetEntity) {
    console.error(`Entities for link ${linkId} not found`);
    return;
  }

  modal = document.createElement('atp-modal') as AtpModal;
  modal.style.setProperty('--atp-modal-width', '500px');

  const header = document.createElement('atp-modal-header');
  header.textContent = 'Link Settings';
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.style.cssText = 'color:var(--vbs-text-primary, #f4f4f5);font-size:14px;display:flex;flex-direction:column;gap:16px;';

  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'font-weight:bold;text-align:center;padding-bottom:12px;border-bottom:1px solid var(--vbs-border, #27272a);font-size:16px;';
  
  const updateTitle = () => {
    const leftCard = sourceCardDropdown.getSelectElement().value || '1';
    const rightCard = targetCardDropdown.getSelectElement().value || 'n';
    titleDiv.textContent = `${sourceEntity.name} (${leftCard}) <=> (${rightCard}) ${targetEntity.name}`;
  };

  const createDropdown = (label: string, options: {value: string; label: string}[], value: string) => {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size:12px;color:var(--vbs-text-secondary, #a1a1aa);';
    
    const select = document.createElement('select');
    select.style.cssText = 'background:var(--vbs-bg-panel, #111111);color:var(--vbs-text-primary, #f4f4f5);border:1px solid var(--vbs-border, #27272a);border-radius: var(--vbs-radius, 2px);padding:8px;font-size:13px;';
    
    // Add empty option for properties
    if (label.includes('Property')) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'None';
      select.appendChild(emptyOpt);
    }

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === value) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    container.appendChild(labelEl);
    container.appendChild(select);
    
    return { container, getSelectElement: () => select };
  };

  const cardinalityOptions = [
    { value: '1', label: '1 (One)' },
    { value: 'n', label: 'n (Many)' },
    { value: '0..1', label: '0..1 (Zero or One)' },
    { value: '0..n', label: '0..n (Zero or Many)' }
  ];

  const sourceProperties = sourceEntity.properties.map((p: any) => ({ value: p.key, label: p.label || p.key }));
  const targetProperties = targetEntity.properties.map((p: any) => ({ value: p.key, label: p.label || p.key }));

  const sourceCardDropdown = createDropdown('Left Cardinality', cardinalityOptions, link.sourceCardinality || '1');
  const targetCardDropdown = createDropdown('Right Cardinality', cardinalityOptions, link.targetCardinality || 'n');
  const sourcePropDropdown = createDropdown('Left Property', sourceProperties, link.sourceProperty || '');
  const renderTypeDropdown = createDropdown('Line Style', [{value:'orthogonal',label:'Orthogonal'}, {value:'linear',label:'Linear'}, {value:'bezier',label:'Bezier'}], link.renderType || '');
  const targetPropDropdown = createDropdown('Right Property', targetProperties, link.targetProperty || '');

  sourceCardDropdown.getSelectElement().addEventListener('change', updateTitle);
  targetCardDropdown.getSelectElement().addEventListener('change', updateTitle);

  updateTitle();

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;gap:12px;';
  topRow.appendChild(sourceCardDropdown.container);
  topRow.appendChild(targetCardDropdown.container);

  const bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display:flex;gap:12px;';
  bottomRow.appendChild(sourcePropDropdown.container);
  bottomRow.appendChild(targetPropDropdown.container);

  body.appendChild(titleDiv);
  body.appendChild(topRow);
  body.appendChild(bottomRow);
  const bottomRow2 = document.createElement('div');
  bottomRow2.style.cssText = 'display:flex;gap:12px;';
  bottomRow2.appendChild(renderTypeDropdown.container);
  body.appendChild(bottomRow2);

  const footer = document.createElement('atp-modal-footer');
  footer.setAttribute('slot', 'footer');
  
  const closeBtn = createButton({
    variant: 'ghost',
    size: 'md',
    children: 'Cancel',
    onClick: () => modal!.close()
  });

  const saveBtn = createButton({
    variant: 'primary',
    size: 'md',
    children: 'Save',
    onClick: () => {
      canvasAdapter.updateLinkProperties(linkId, {
        sourceCardinality: sourceCardDropdown.getSelectElement().value,
        targetCardinality: targetCardDropdown.getSelectElement().value,
        sourceProperty: sourcePropDropdown.getSelectElement().value || undefined, 
        targetProperty: targetPropDropdown.getSelectElement().value || undefined,
        renderType: renderTypeDropdown.getSelectElement().value as any  
      });
      modal!.close();
    }
  });

  footer.appendChild(closeBtn.element);
  footer.appendChild(saveBtn.element);
  modal.appendChild(body);
  modal.appendChild(footer);
  document.body.appendChild(modal);
  modalCache.set(linkId, modal);

  modal.open().catch(console.error);
};

