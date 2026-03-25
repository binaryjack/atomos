import type { Signal } from '../../core/types/signal.types.js';
import type { DataType } from '@vbs/vbs-mod';
import { createEditableLabel } from '../editable-label/create-editable-label.js';
import { createDropdown } from '../dropdown/create-dropdown.js';
import { createIcon } from '../icon/create-icon.js';

export interface EntityPropertyRowProps {
  readonly id: string;
  readonly label: Signal<string>;
  readonly dataType: Signal<DataType>;
  readonly availableDataTypes: readonly DataType[];
  readonly onLabelChange: (value: string) => void;
  readonly onDataTypeChange: (value: DataType) => void;
  readonly onSettingsClick: () => void;
  readonly onDeleteClick: () => void;
}

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
    'padding:4px 8px',
    'border-bottom:1px solid #1e293b',
    'min-height:30px',
  ].join(';');

  // Editable label
  const editableLabel = createEditableLabel({
    value: props.label,
    placeholder: 'property name',
    className: 'text-xs text-slate-300',
    inputClassName: 'text-xs text-slate-300',
    onChange: props.onLabelChange,
  });
  cleanups.push(editableLabel.cleanup.destroy);

  // DataType dropdown
  const dropdown = createDropdown({
    value: props.dataType as Signal<string>,
    options: props.availableDataTypes.map(dt => ({ value: dt, label: dt })),
    className: 'text-xs',
    onChange: (v) => props.onDataTypeChange(v as DataType),
  });
  dropdown.select.style.cssText = [
    'background:#0f172a', 'color:#94a3b8', 'border:1px solid #334155',
    'border-radius:3px', 'font-size:11px', 'padding:1px 2px',
    'max-width:80px', 'cursor:pointer',
  ].join(';');
  dropdown.element.style.cssText = 'flex-shrink:0;';
  cleanups.push(dropdown.cleanup.destroy);

  // Settings button
  const settingsIcon = createIcon({ name: 'settings', size: 12, color: '#64748b' });
  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.style.cssText = 'flex-shrink:0;background:none;border:none;cursor:pointer;padding:1px;display:flex;border-radius:2px;';
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
  deleteBtn.style.cssText = 'flex-shrink:0;background:none;border:none;cursor:pointer;padding:1px;display:flex;border-radius:2px;';
  deleteBtn.title = 'Remove property';
  deleteBtn.appendChild(deleteIcon.element);
  deleteBtn.addEventListener('click', props.onDeleteClick);
  cleanups.push(() => {
    deleteBtn.removeEventListener('click', props.onDeleteClick);
    deleteIcon.cleanup.destroy();
  });

  row.appendChild(editableLabel.element);
  row.appendChild(dropdown.element);
  row.appendChild(settingsBtn);
  row.appendChild(deleteBtn);

  return {
    element: row,
    cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } }
  };
};
