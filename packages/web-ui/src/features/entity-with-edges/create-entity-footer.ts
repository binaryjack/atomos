import { computeContrastColor } from '../../core/utils/compute-contrast-color.js';
import { createIcon } from '../icon/create-icon.js';

export interface EntityFooterProps {
  readonly onAddProperty: () => void;
  readonly color?: string | undefined;
}

export interface EntityFooterResult {
  readonly element: HTMLDivElement;
  readonly cleanup: { destroy: () => void };
}

export const createEntityFooter = function(props: EntityFooterProps): EntityFooterResult {
  const bgColor  = props.color || '#1e293b';
  const contrast = computeContrastColor(bgColor);

  const footer = document.createElement('div');
  footer.style.cssText = [
    'display:flex', 'align-items:center', 'gap:4px',
    'padding:4px 8px',
    `background:${bgColor}`,
    'border-top:1px solid #334155',
    'flex-shrink:0',
    'min-height:30px',
  ].join(';');

  const plusIcon = createIcon({ name: 'plus', size: 12, color: contrast.mutedColor });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.style.cssText = [
    'display:flex', 'align-items:center', 'gap:4px',
    'background:none', 'border:none', 'cursor:pointer',
    `color:${contrast.textColor}`, 'font-size:11px', 'padding:2px 4px',
    'border-radius:3px',
  ].join(';');
  addBtn.title = 'Add property';

  const label = document.createElement('span');
  label.textContent = 'Add property';

  addBtn.appendChild(plusIcon.element);
  addBtn.appendChild(label);
  addBtn.addEventListener('click', props.onAddProperty);
  footer.appendChild(addBtn);

  return {
    element: footer,
    cleanup: {
      destroy: () => {
        addBtn.removeEventListener('click', props.onAddProperty);
        plusIcon.cleanup.destroy();
      }
    }
  };
};
