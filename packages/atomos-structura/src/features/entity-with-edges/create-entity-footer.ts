import { computeContrastColor } from '@atomos-web/prime';
import { createIcon } from '@atomos-web/prime';

export interface EntityFooterProps {
  readonly onAddProperty: () => void;
  readonly color?: string | undefined;
  readonly isReadonly?: boolean;
}

export interface EntityFooterResult {
  readonly element: HTMLDivElement;
  readonly cleanup: { destroy: () => void };
}

export const createEntityFooter = function(props: EntityFooterProps): EntityFooterResult {
  const bgColor  = props.color || 'var(--vbs-bg-panel, #111111)';
  const contrast = computeContrastColor(bgColor);

  const footer = document.createElement('div');
  footer.classList.add('vbs-entity-footer');
  footer.style.background = bgColor;

  const plusIcon = createIcon({ name: 'plus', size: 'calc(var(--vbs-entity-props-font-size, 11px) + 2px)', color: contrast.mutedColor });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.classList.add('vbs-entity-footer-btn');
  addBtn.style.color = contrast.textColor;
  addBtn.title = 'Add property';

  const label = document.createElement('span');
  label.textContent = 'Add property';

  addBtn.appendChild(plusIcon.element);
  addBtn.appendChild(label);
  addBtn.addEventListener('click', props.onAddProperty);
  
  if (!props.isReadonly) {
    footer.appendChild(addBtn);
  } else {
    footer.style.minHeight = '0';
    footer.style.padding = '0';
    footer.style.borderTop = 'none';
  }

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
