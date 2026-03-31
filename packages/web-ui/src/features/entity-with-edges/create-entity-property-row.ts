import type { ComponentType, DataType } from '@vbs/vbs-mod';
import type { Signal } from '../../core/types/signal.types.js';
import { createDropdown } from '../dropdown/create-dropdown.js';
import { createEditableLabel } from '../editable-label/create-editable-label.js';
import { createIcon } from '../icon/create-icon.js';

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
    'background:#0f172a', 'color:#e2e8f0',
    'border:1px solid #334155', 'border-radius:3px',
    'font-size:11px', 'padding:0 4px',
    'height:22px', 'width:100%', 'box-sizing:border-box', 'min-width:0', 'outline:none',
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
      cb.style.cssText = 'cursor:pointer;flex-shrink:0;accent-color:#6366f1;width:14px;height:14px;align-self:center;';
      cb.addEventListener('change', () => onValueChange(cb.checked));
      valueSub = value.subscribe(() => { cb.checked = Boolean(value.value); });
      currentInput = cb;
    } else if (ct === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'no-drag';
      ta.value = String(value.value ?? '');
      ta.rows = 1;
      ta.style.cssText = sharedStyle + ';resize:none;height:22px;overflow:hidden;padding:2px 4px;';
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
    'padding:0 8px',
    'box-sizing:border-box',
    'height:28px',
    'border-bottom:1px solid #1e293b',
  ].join(';');

  // Editable label (compact — value input takes remaining space)
  const editableLabel = createEditableLabel({
    value: props.label,
    placeholder: 'name',
    className: 'text-xs text-slate-300',
    inputClassName: 'text-xs text-slate-300',
    onChange: props.onLabelChange,
  });
  editableLabel.element.style.flex = '0 0 auto';
  editableLabel.element.style.maxWidth = '64px';
  editableLabel.element.style.overflow = 'hidden';
  cleanups.push(editableLabel.cleanup.destroy);

  // Value input — type adapts to componentType + dataType
  const valueInput = buildValueInput(
    props.componentType,
    props.dataType,
    props.value,
    props.onValueChange,
    cleanups
  );

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
    'background:#0f172a', 'color:#818cf8', 'border:1px solid #312e81',
    'border-radius:3px', 'font-size:11px', 'padding:0 2px',
    'width:44px', 'height:22px', 'cursor:pointer', 'box-sizing:border-box',
  ].join(';');
  ctDropdown.element.style.cssText = 'flex-shrink:0;display:flex;align-items:center;';
  cleanups.push(ctDropdown.cleanup.destroy);

  // DataType dropdown
  const dropdown = createDropdown({
    value: props.dataType as Signal<string>,
    options: props.availableDataTypes.map(dt => ({ value: dt, label: dt })),
    className: 'text-xs',
    onChange: (v) => props.onDataTypeChange(v as DataType),
  });
  dropdown.select.style.cssText = [
    'background:#0f172a', 'color:#94a3b8', 'border:1px solid #334155',
    'border-radius:3px', 'font-size:11px', 'padding:0 2px',
    'max-width:72px', 'height:22px', 'cursor:pointer', 'box-sizing:border-box',
  ].join(';');
  dropdown.element.style.cssText = 'flex-shrink:0;display:flex;align-items:center;';
  cleanups.push(dropdown.cleanup.destroy);

  // Settings button
  const settingsIcon = createIcon({ name: 'settings', size: 12, color: '#64748b' });
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
  const deleteIcon = createIcon({ name: 'delete', size: 12, color: '#f87171' });
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
