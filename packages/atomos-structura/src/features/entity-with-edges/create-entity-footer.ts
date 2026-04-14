import { computeContrastColor } from '@atomos-web/prime';
import { createIcon } from '@atomos-web/prime';

export interface EntityFooterProps {
  readonly onAddProperty: () => void;
  readonly color?: string | undefined;
}

export interface EntityFooterResult {
  readonly element: HTMLDivElement;
  readonly cleanup: { destroy: () => void };
}

export const createEntityFooter = function(props: EntityFooterProps): EntityFooterResult {
  const bgColor  = props.color || 'var(--vbs-bg-panel, #111111)';
  const contrast = computeContrastColor(bgColor);

  const footer = document.createElement('div');
  footer.style.cssText = [
    'display:flex', 'align-items:center', 'gap:4px',
    'padding:4px 8px',
    `background:${bgColor}`,
    'border-top:1px solid var(--vbs-border, #27272a)',
    'flex-shrink:0',
    'min-height:calc(var(--vbs-entity-props-font-size, 11px) + 20px)',
  ].join(';');

  const plusIcon = createIcon({ name: 'plus', size: 'calc(var(--vbs-entity-props-font-size, 11px) + 2px)', color: contrast.mutedColor });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.style.cssText = [
    'display:flex', 'align-items:center', 'gap:4px',
    'background:none', 'border:none', 'cursor:pointer',
    `color:${contrast.textColor}`, 'font-size:var(--vbs-entity-props-font-size, 11px)', 'padding:2px 4px',
    'font-family:var(--vbs-entity-props-font-family, system-ui, sans-serif)',
    'border-radius: var(--vbs-radius, 2px)',
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
