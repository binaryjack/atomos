import type { ComponentType, DataType } from '@atomos-web/structura-core';
import type { Signal } from '@atomos-web/prime';
import { createDropdown } from '@atomos-web/prime';
import { createEditableLabel } from '@atomos-web/prime';
import { createIcon } from '@atomos-web/prime';

export interface EntityPropertyRowProps {
  readonly id: string;
  readonly label: Signal<string>;
  readonly dataType: Signal<DataType>;
  readonly componentType: Signal<ComponentType>;
  readonly value: Signal<unknown>;
  readonly availableDataTypes: readonly DataType[];
  readonly onLabelChange: (value: string) => void;
  readonly onDataTypeChange: (value: DataType) => void;
  readonly onComponentTypeChange: (value: ComponentType) => void;
  readonly onValueChange: (value: unknown) => void;
  readonly onSettingsClick: () => void;
  readonly onDeleteClick: () => void;
  readonly isReadonly?: boolean;
  readonly required?: boolean;
}

const buildValueInput = function(
  componentType: Signal<ComponentType>,
  dataType: Signal<DataType>,
  value: Signal<unknown>,
  onValueChange: (v: unknown) => void,
  cleanups: Array<() => void>,
  isReadonly?: boolean
): HTMLElement {
  const wrap = document.createElement('span');
  wrap.classList.add('vbs-property-row-wrap');

  let currentInput: HTMLElement | null = null;
  let valueSub: (() => void) | null = null;



  const rebuild = (): void => {
    if (currentInput) {
      valueSub?.();
      valueSub = null;
      if (currentInput.parentNode) currentInput.parentNode.removeChild(currentInput);
      currentInput = null;
    }
    const ct = componentType.value;
    const dt = dataType.value;

    if (ct === 'checkbox' || dt === 'boolean') {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.classList.add('no-drag', 'vbs-property-checkbox');
      cb.disabled = !!isReadonly;
      cb.checked = Boolean(value.value);
      cb.addEventListener('change', () => onValueChange(cb.checked));
      valueSub = value.subscribe(() => { cb.checked = Boolean(value.value); });
      currentInput = cb;
    } else if (ct === 'textarea') {
      const ta = document.createElement('textarea');
      ta.classList.add('no-drag', 'vbs-property-input-base', 'vbs-property-textarea');
      ta.disabled = !!isReadonly;
      ta.value = String(value.value ?? '');
      ta.rows = 1;
      ta.addEventListener('change', () => onValueChange(ta.value));
      valueSub = value.subscribe(() => { ta.value = String(value.value ?? ''); });
      currentInput = ta;
    } else {
      const inp = document.createElement('input');
      inp.classList.add('no-drag', 'vbs-property-input-base', 'vbs-property-input');
      inp.disabled = !!isReadonly;
      if (dt === 'number' || dt === 'integer' || dt === 'float') inp.type = 'number';
      else if (dt === 'date') inp.type = 'date';
      else inp.type = 'text';
      inp.value = String(value.value ?? '');
      inp.placeholder = dt;
      inp.addEventListener('change', () => onValueChange(inp.value));
      valueSub = value.subscribe(() => { inp.value = String(value.value ?? ''); });
      currentInput = inp;
    }
    wrap.appendChild(currentInput);
  };

  rebuild();

  const unsubCt = componentType.subscribe(rebuild);
  const unsubDt = dataType.subscribe(rebuild);
  cleanups.push(() => { unsubCt(); unsubDt(); valueSub?.(); });

  return wrap;
};

export interface EntityPropertyRowResult {
  readonly element: HTMLDivElement;
  readonly cleanup: { destroy: () => void };
}

export const createEntityPropertyRow = function(
  props: EntityPropertyRowProps
): EntityPropertyRowResult {
  const cleanups: Array<() => void> = [];

  const row = document.createElement('div');
  row.classList.add('vbs-property-row');

  if (props.isReadonly) {
    row.style.padding = '6px 8px';
    row.style.alignItems = 'center';
    
    // Name
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('vbs-property-name');
    nameSpan.textContent = props.label.value;
    
    // Type Pill container
    const typePill = document.createElement('span');
    typePill.classList.add('vbs-property-type-pill');
    
    const dtSpan = document.createElement('span');
    dtSpan.textContent = props.dataType.value || 'string';
    typePill.appendChild(dtSpan);
    
    if (props.required) {
      const reqSpan = document.createElement('span');
      reqSpan.textContent = '*';
      reqSpan.classList.add('vbs-property-req-star');
      typePill.appendChild(reqSpan);
    }
    
    row.appendChild(nameSpan);
    row.appendChild(typePill);
    
    const unsubLabel = props.label.subscribe(v => nameSpan.textContent = v);
    const unsubType = props.dataType.subscribe(v => dtSpan.textContent = v || 'string');
    cleanups.push(unsubLabel, unsubType);
    
    return {
      element: row,
      cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } }
    };
  }

  // Editable label (compact — value input takes remaining space)
  const editableLabel = createEditableLabel({
    value: props.label,
    placeholder: 'name',
    className: 'text-xs text-slate-300',
    inputClassName: 'text-xs text-slate-300',
    onChange: props.onLabelChange,
  });
  editableLabel.element.style.flex = '1 1 min-content';
  editableLabel.element.style.minWidth = '50px';
  editableLabel.element.style.overflow = 'hidden';
  editableLabel.element.style.fontFamily = 'var(--vbs-entity-props-font-family, system-ui, sans-serif)';
  editableLabel.element.style.fontSize = 'var(--vbs-entity-props-font-size, 12px)';
  editableLabel.element.style.fontWeight = 'var(--vbs-entity-props-font-weight, normal)';
  editableLabel.element.style.color = 'var(--vbs-entity-props-color, #a1a1aa)';
  cleanups.push(editableLabel.cleanup.destroy);

  // Value input — type adapts to componentType + dataType
  const valueInput = buildValueInput(
    props.componentType,
    props.dataType,
    props.value,
    props.onValueChange,
    cleanups,
    props.isReadonly
  );
  valueInput.style.flex = '2 1 100px';

  // ComponentType dropdown (compact: inp / sel / chk / txt)
  const ctOptions: Array<{ value: ComponentType; label: string }> = [
    { value: 'input',    label: 'inp' },
    { value: 'select',   label: 'sel' },
    { value: 'checkbox', label: 'chk' },
    { value: 'textarea', label: 'txt' },
  ];
  const ctDropdown = createDropdown({
    value: props.componentType as Signal<string>,
    options: ctOptions,
    className: 'text-xs',
    onChange: (v) => props.onComponentTypeChange(v as ComponentType),
  });
  ctDropdown.select.classList.add('vbs-property-dropdown');
  ctDropdown.element.classList.add('vbs-property-dropdown');
  cleanups.push(ctDropdown.cleanup.destroy);

  // DataType dropdown
  const dropdown = createDropdown({
    value: props.dataType as Signal<string>,
    options: (props.availableDataTypes || []).map(dt => ({ value: dt, label: dt })),
    className: 'text-xs',
    onChange: (v) => props.onDataTypeChange(v as DataType),
  });
  dropdown.select.classList.add('vbs-property-dropdown');
  dropdown.element.classList.add('vbs-property-dropdown');
  cleanups.push(dropdown.cleanup.destroy);

  // Settings button
  const settingsIcon = createIcon({ name: 'settings', size: 'calc(var(--vbs-entity-props-font-size, 12px) + 2px)', color: '#64748b' });
  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.classList.add('vbs-property-action-btn');
  settingsBtn.title = 'Property settings';
  settingsBtn.appendChild(settingsIcon.element);
  settingsBtn.addEventListener('click', props.onSettingsClick);
  cleanups.push(() => {
    settingsBtn.removeEventListener('click', props.onSettingsClick);
    settingsIcon.cleanup.destroy();
  });

  // Delete button
  const deleteIcon = createIcon({ name: 'delete', size: 'calc(var(--vbs-entity-props-font-size, 12px) + 2px)', color: 'var(--vbs-danger, #ef4444)' });
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.classList.add('vbs-property-action-btn');
  deleteBtn.title = 'Remove property';
  deleteBtn.appendChild(deleteIcon.element);
  deleteBtn.addEventListener('click', props.onDeleteClick);
  cleanups.push(() => {
    deleteBtn.removeEventListener('click', props.onDeleteClick);
    deleteIcon.cleanup.destroy();
  });

  row.appendChild(editableLabel.element);
  row.appendChild(valueInput);
  row.appendChild(ctDropdown.element);
  row.appendChild(dropdown.element);
  row.appendChild(settingsBtn);
  row.appendChild(deleteBtn);

  return {
    element: row,
    cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } }
  };
};
