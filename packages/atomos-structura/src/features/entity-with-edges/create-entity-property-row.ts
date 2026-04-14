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
}

const buildValueInput = function(
  componentType: Signal<ComponentType>,
  dataType: Signal<DataType>,
  value: Signal<unknown>,
  onValueChange: (v: unknown) => void,
  cleanups: Array<() => void>
): HTMLElement {
  const wrap = document.createElement('span');
  wrap.style.cssText = 'flex:1;min-width:0;display:flex;align-items:center;overflow:hidden;';

  let currentInput: HTMLElement | null = null;
  let valueSub: (() => void) | null = null;

  const sharedStyle = [
    'background:var(--vbs-bg-input, #09090b)', 'color:var(--vbs-text-primary, #f4f4f5)',
    'border:1px solid var(--vbs-border, #27272a)', 'border-radius:var(--vbs-radius, 2px)',
    'font-size:var(--vbs-entity-props-font-size, 12px)', 'padding:0 6px',
    'height:var(--vbs-control-height, 28px)', 'width:100%', 'box-sizing:border-box', 'min-width:0', 'outline:none',
    'transition:border-color 0.15s ease'
  ].join(';');

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
      cb.className = 'no-drag';
      cb.checked = Boolean(value.value);
      cb.style.cssText = 'cursor:pointer;flex-shrink:0;width:calc(var(--vbs-entity-props-font-size, 12px) + 2px);height:calc(var(--vbs-entity-props-font-size, 12px) + 2px);align-self:center;appearance:none;background:var(--vbs-bg-input, #09090b);border:1px solid var(--vbs-border, #27272a);border-radius:var(--vbs-radius, 2px);transition:background-color 0.15s, border-color 0.15s;';
      cb.addEventListener('change', () => {
        onValueChange(cb.checked);
        if(cb.checked) {
          cb.style.background = 'var(--vbs-primary, #3b82f6)';
          cb.style.borderColor = 'var(--vbs-primary, #3b82f6)';
        } else {
          cb.style.background = 'var(--vbs-bg-input, #09090b)';
          cb.style.borderColor = 'var(--vbs-border, #27272a)';
        }
      });
      // Initial style application
      if(cb.checked) {
        cb.style.background = 'var(--vbs-primary, #3b82f6)';
        cb.style.borderColor = 'var(--vbs-primary, #3b82f6)';
      }
      valueSub = value.subscribe(() => { 
        cb.checked = Boolean(value.value); 
        if(cb.checked) {
          cb.style.background = 'var(--vbs-primary, #3b82f6)';
          cb.style.borderColor = 'var(--vbs-primary, #3b82f6)';
        } else {
          cb.style.background = 'var(--vbs-bg-input, #09090b)';
          cb.style.borderColor = 'var(--vbs-border, #27272a)';
        }
      });
      currentInput = cb;
    } else if (ct === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'no-drag';
      ta.value = String(value.value ?? '');
      ta.rows = 1;
      ta.style.cssText = sharedStyle + ';resize:none;height:auto;overflow:hidden;padding:2px 4px;';
      ta.addEventListener('change', () => onValueChange(ta.value));
      valueSub = value.subscribe(() => { ta.value = String(value.value ?? ''); });
      currentInput = ta;
    } else {
      const inp = document.createElement('input');
      inp.className = 'no-drag';
      if (dt === 'number' || dt === 'integer' || dt === 'float') inp.type = 'number';
      else if (dt === 'date') inp.type = 'date';
      else inp.type = 'text';
      inp.value = String(value.value ?? '');
      inp.placeholder = dt;
      inp.style.cssText = sharedStyle;
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
  row.style.cssText = [
    'display:flex', 'align-items:center', 'gap:4px',
    'padding:2px 8px',
    'box-sizing:border-box',
    'min-height:28px',
    'border-bottom:1px solid var(--vbs-border, #27272a)',
  ].join(';');

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
    cleanups
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
  ctDropdown.select.style.cssText = [
    '--dropdown-bg-color:var(--vbs-bg-input, #09090b)',
    '--dropdown-text-color:var(--vbs-primary, #3b82f6)',
    '--dropdown-border-color:var(--vbs-border, #27272a)',
    '--dropdown-focus-border-color:var(--vbs-primary, #3b82f6)',
    '--dropdown-border-radius:var(--vbs-radius, 2px)',
    '--dropdown-font-size:var(--vbs-entity-props-font-size, 12px)',
    '--dropdown-padding:0 20px 0 6px',
    'width:60px',
    'height:var(--vbs-control-height, 28px)',
    'box-sizing:border-box',
    'outline:none'
  ].join(';');
  ctDropdown.element.style.cssText = 'flex-shrink:0;height:var(--vbs-control-height, 28px);display:flex;align-items:center;';
  cleanups.push(ctDropdown.cleanup.destroy);

  // DataType dropdown
  const dropdown = createDropdown({
    value: props.dataType as Signal<string>,
    options: props.availableDataTypes.map(dt => ({ value: dt, label: dt })),
    className: 'text-xs',
    onChange: (v) => props.onDataTypeChange(v as DataType),
  });
  dropdown.select.style.cssText = [
    '--dropdown-bg-color:var(--vbs-bg-input, #09090b)',
    '--dropdown-text-color:var(--vbs-text-secondary, #a1a1aa)',
    '--dropdown-border-color:var(--vbs-border, #27272a)',
    '--dropdown-focus-border-color:var(--vbs-primary, #3b82f6)',
    '--dropdown-border-radius:var(--vbs-radius, 2px)',
    '--dropdown-font-size:var(--vbs-entity-props-font-size, 12px)',
    '--dropdown-padding:0 20px 0 6px',
    'width:80px',
    'height:var(--vbs-control-height, 28px)',
    'box-sizing:border-box',
    'outline:none'
  ].join(';');
  dropdown.element.style.cssText = 'flex-shrink:0;height:var(--vbs-control-height, 28px);display:flex;align-items:center;';
  cleanups.push(dropdown.cleanup.destroy);

  // Settings button
  const settingsIcon = createIcon({ name: 'settings', size: 'calc(var(--vbs-entity-props-font-size, 12px) + 2px)', color: '#64748b' });
  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.style.cssText = 'flex-shrink:0;align-self:center;background:none;border:none;cursor:pointer;padding:1px;display:flex;align-items:center;border-radius:2px;';
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
  deleteBtn.style.cssText = 'flex-shrink:0;align-self:center;background:none;border:none;cursor:pointer;padding:1px;display:flex;align-items:center;border-radius:2px;';
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
