import { computeContrastColor } from '@atomos-web/prime';
import type { Signal } from '@atomos-web/prime';
import { createEditableLabel } from '@atomos-web/prime';
import { createIcon } from '@atomos-web/prime';

export interface EntityHeaderProps {
  readonly label: Signal<string>;
  readonly isCollapsed: Signal<boolean>;
  readonly onLabelChange: (value: string) => void;
  readonly onToggleCollapse: () => void;
  readonly onSettingsClick: () => void;
  readonly onDeleteClick: () => void;
  readonly color?: string | undefined;
  readonly isReadonly?: boolean;
}

export interface EntityHeaderResult {
  readonly element: HTMLDivElement;
  readonly cleanup: { destroy: () => void };
}

export const createEntityHeader = function(props: EntityHeaderProps): EntityHeaderResult {
  const cleanups: Array<() => void> = [];

  const bgColor   = 'var(--vbs-entity-color, var(--vbs-bg-panel, #111111))';
  const contrast  = computeContrastColor(props.color || '#111111');

  const header = document.createElement('div');
  header.classList.add('vbs-entity-header');
  header.style.background = bgColor;
  header.style.cursor = 'grab';

  // Editable label (flex-1)
  const editableLabel = createEditableLabel({
    value: props.label,
    placeholder: 'Entity name',
    className: 'text-sm font-semibold text-slate-100',
    inputClassName: 'text-sm font-semibold text-slate-100',
    onChange: props.onLabelChange,
  });
  // Override text colour based on background contrast; font from appearance settings vars
  editableLabel.element.style.color = contrast.textColor;
  editableLabel.element.style.fontFamily = 'var(--vbs-entity-name-font-family, system-ui, sans-serif)';
  editableLabel.element.style.fontSize = 'var(--vbs-entity-name-font-size, 14px)';
  editableLabel.element.style.fontWeight = 'var(--vbs-entity-name-font-weight, bold)';
  
  if (props.isReadonly) {
    editableLabel.element.style.pointerEvents = 'none';
  }
  cleanups.push(editableLabel.cleanup.destroy);

  // Collapse button
  const collapseIcon = createIcon({ name: 'chevron-down', size: 'var(--vbs-entity-name-font-size, 14px)', color: contrast.mutedColor });
  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.classList.add('vbs-entity-header-btn');
  collapseBtn.title = 'Toggle collapse';
  collapseBtn.appendChild(collapseIcon.element);
  collapseBtn.addEventListener('click', props.onToggleCollapse);
  const stopCollapseMd = (e: Event): void => e.stopPropagation();
  collapseBtn.addEventListener('mousedown', stopCollapseMd);
  const unsubCollapse = props.isCollapsed.subscribe(collapsed => {
    collapseBtn.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
  });
  
  cleanups.push(() => {
    collapseBtn.removeEventListener('click', props.onToggleCollapse);
    collapseBtn.removeEventListener('mousedown', stopCollapseMd);
    collapseIcon.cleanup.destroy();
    unsubCollapse();
  });

  // Settings button
  const settingsIcon = createIcon({ name: 'settings', size: 'var(--vbs-entity-name-font-size, 14px)', color: contrast.mutedColor });
  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.classList.add('vbs-entity-header-btn');
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
  const deleteIcon = createIcon({ name: 'delete', size: 'var(--vbs-entity-name-font-size, 14px)', color: 'var(--vbs-danger, #ef4444)' });
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.classList.add('vbs-entity-header-btn');
  deleteBtn.title = 'Delete entity';
  deleteBtn.appendChild(deleteIcon.element);
  deleteBtn.addEventListener('click', (e) => {
    console.log('[DEBUG] Delete entity button clicked! Firing props.onDeleteClick()');
    props.onDeleteClick();
  });
  const stopDeleteMd = (e: Event): void => e.stopPropagation();
  deleteBtn.addEventListener('mousedown', stopDeleteMd);
  cleanups.push(() => {
    deleteBtn.removeEventListener('click', props.onDeleteClick);
    deleteBtn.removeEventListener('mousedown', stopDeleteMd);
    deleteIcon.cleanup.destroy();
  });

  header.appendChild(editableLabel.element);
  
  if (!props.isReadonly) {
    header.insertBefore(collapseBtn, editableLabel.element);
    header.appendChild(settingsBtn);
    header.appendChild(deleteBtn);
  }

  return {
    element: header,
    cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } }
  };
};
