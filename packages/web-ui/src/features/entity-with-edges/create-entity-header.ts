import { computeContrastColor } from '../../core/utils/compute-contrast-color.js';
import type { Signal } from '../../core/types/signal.types.js';
import { createEditableLabel } from '../editable-label/create-editable-label.js';
import { createIcon } from '../icon/create-icon.js';

export interface EntityHeaderProps {
  readonly label: Signal<string>;
  readonly onLabelChange: (value: string) => void;
  readonly onSettingsClick: () => void;
  readonly onDeleteClick: () => void;
  readonly color?: string | undefined;
}

export interface EntityHeaderResult {
  readonly element: HTMLDivElement;
  readonly cleanup: { destroy: () => void };
}

export const createEntityHeader = function(props: EntityHeaderProps): EntityHeaderResult {
  const cleanups: Array<() => void> = [];

  const bgColor   = props.color || '#1e293b';
  const contrast  = computeContrastColor(bgColor);

  const header = document.createElement('div');
  header.style.cssText = [
    'display:flex', 'align-items:center', 'gap:4px',
    'padding:6px 8px',
    `background:${bgColor}`,
    'border-bottom:1px solid #334155',
    'flex-shrink:0',
    'min-height:36px',
    'cursor:grab',
  ].join(';');

  // Editable label (flex-1)
  const editableLabel = createEditableLabel({
    value: props.label,
    placeholder: 'Entity name',
    className: 'text-sm font-semibold text-slate-100',
    inputClassName: 'text-sm font-semibold text-slate-100',
    onChange: props.onLabelChange,
  });
  // Override text colour based on background contrast
  editableLabel.element.style.color = contrast.textColor;
  cleanups.push(editableLabel.cleanup.destroy);

  // Settings button
  const settingsIcon = createIcon({ name: 'settings', size: 14, color: contrast.mutedColor });
  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.style.cssText = 'flex-shrink:0;background:none;border:none;cursor:pointer;padding:2px;display:flex;border-radius:3px;';
  settingsBtn.title = 'Entity settings';
  settingsBtn.appendChild(settingsIcon.element);
  settingsBtn.addEventListener('click', props.onSettingsClick);
  const stopSettingsMd = (e: Event): void => e.stopPropagation();
  settingsBtn.addEventListener('mousedown', stopSettingsMd);
  cleanups.push(() => {
    settingsBtn.removeEventListener('click', props.onSettingsClick);
    settingsBtn.removeEventListener('mousedown', stopSettingsMd);
    settingsIcon.cleanup.destroy();
  });

  // Delete button
  const deleteIcon = createIcon({ name: 'delete', size: 14, color: '#f87171' });
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.style.cssText = 'flex-shrink:0;background:none;border:none;cursor:pointer;padding:2px;display:flex;border-radius:3px;';
  deleteBtn.title = 'Delete entity';
  deleteBtn.appendChild(deleteIcon.element);
  deleteBtn.addEventListener('click', props.onDeleteClick);
  const stopDeleteMd = (e: Event): void => e.stopPropagation();
  deleteBtn.addEventListener('mousedown', stopDeleteMd);
  cleanups.push(() => {
    deleteBtn.removeEventListener('click', props.onDeleteClick);
    deleteBtn.removeEventListener('mousedown', stopDeleteMd);
    deleteIcon.cleanup.destroy();
  });

  header.appendChild(editableLabel.element);
  header.appendChild(settingsBtn);
  header.appendChild(deleteBtn);

  return {
    element: header,
    cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } }
  };
};
