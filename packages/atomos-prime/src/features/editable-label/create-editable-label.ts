import type { EditableLabelProps, EditableLabelResult } from './types/editable-label.types.js'

export type { EditableLabelProps, EditableLabelResult }

export const createEditableLabel = function(props: EditableLabelProps): EditableLabelResult {
  const cleanups: Array<() => void> = [];

  // Wrapper — keeps layout stable during mode switch
  const wrapper = document.createElement('span');
  wrapper.className = props.className ?? '';
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.minWidth = '0';
  wrapper.style.maxWidth = '100%';
  wrapper.style.flex = '1';
  wrapper.style.position = 'relative';

  // Label span (view mode)
  const span = document.createElement('span');
  span.style.overflow = 'hidden';
  span.style.textOverflow = 'ellipsis';
  span.style.cursor = 'inherit';
  span.style.userSelect = 'none';
  span.style.flex = '1';
  span.style.minWidth = '0';
  span.style.maxWidth = '100%';

  if (props.multiline) {
    span.style.whiteSpace = 'normal';
    span.style.wordBreak = 'break-word';
    span.style.overflowWrap = 'anywhere';
    span.style.display = '-webkit-box';
    (span.style as any).webkitBoxOrient = 'vertical';
    (span.style as any).webkitLineClamp = (props.maxLines ?? 3).toString();
    span.style.lineHeight = '1.25';
  } else {
    span.style.whiteSpace = 'nowrap';
  }

  const applyAdaptiveTypography = (text: string) => {
    const len = text.length;
    if (props.multiline) {
      if (len > 45) {
        span.style.fontSize = '11px';
        span.style.lineHeight = '1.2';
      } else if (len > 24) {
        span.style.fontSize = '12px';
        span.style.lineHeight = '1.25';
      } else {
        span.style.fontSize = '';
        span.style.lineHeight = '1.3';
      }
    }
  };

  const initialVal = props.value.value || (props.placeholder ?? '');
  span.textContent = initialVal;
  span.title = initialVal;
  applyAdaptiveTypography(initialVal);

  // Full-text Popover on click for long titles
  let popoverEl: HTMLDivElement | null = null;
  const hidePopover = () => {
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
      document.removeEventListener('click', hidePopover);
    }
  };

  const showPopover = (e: MouseEvent) => {
    const text = props.value.value;
    if (!text || text.length < 30 || editing) return;
    
    e.stopPropagation();
    hidePopover();

    popoverEl = document.createElement('div');
    popoverEl.className = 'vbs-text-popover';
    popoverEl.textContent = text;
    popoverEl.style.position = 'fixed';
    popoverEl.style.zIndex = '99999';
    popoverEl.style.maxWidth = '380px';
    popoverEl.style.padding = '8px 12px';
    popoverEl.style.background = 'rgba(15, 23, 42, 0.95)';
    popoverEl.style.backdropFilter = 'blur(12px)';
    popoverEl.style.border = '1px solid rgba(59, 130, 246, 0.4)';
    popoverEl.style.borderRadius = '6px';
    popoverEl.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.6)';
    popoverEl.style.color = '#f8fafc';
    popoverEl.style.fontSize = '12px';
    popoverEl.style.lineHeight = '1.4';
    popoverEl.style.wordBreak = 'break-word';
    popoverEl.style.pointerEvents = 'auto';
    popoverEl.style.cursor = 'default';

    const rect = span.getBoundingClientRect();
    popoverEl.style.left = `${Math.max(10, Math.min(window.innerWidth - 400, rect.left))}px`;
    popoverEl.style.top = `${rect.bottom + 6}px`;

    document.body.appendChild(popoverEl);
    setTimeout(() => {
      document.addEventListener('click', hidePopover);
    }, 10);
  };

  if (props.enablePopover !== false) {
    span.addEventListener('click', showPopover);
    cleanups.push(() => {
      span.removeEventListener('click', showPopover);
      hidePopover();
    });
  }

  // Input (edit mode) — created lazily
  let input: HTMLInputElement | HTMLTextAreaElement | null = null;
  let editing = false;

  const enterEdit = (): void => {
    if (editing) return;
    editing = true;
    hidePopover();

    if (props.multiline) {
      input = document.createElement('textarea');
      (input as HTMLTextAreaElement).rows = 2;
      input.style.resize = 'none';
      input.style.lineHeight = '1.25';
    } else {
      input = document.createElement('input');
      (input as HTMLInputElement).type = 'text';
    }

    input.value = props.value.value;
    input.placeholder = props.placeholder ?? '';
    input.className = props.inputClassName ?? '';
    input.style.flex = '1';
    input.style.minWidth = '0';
    input.style.width = '100%';
    input.style.background = 'var(--vbs-bg-panel, #111111)';
    input.style.border = 'none';
    input.style.outline = '1px solid var(--vbs-primary, #3b82f6)';
    input.style.borderRadius = '2px';
    input.style.padding = '2px 4px';
    input.style.font = 'inherit';
    input.style.fontSize = '12px';
    input.style.color = '#f1f5f9';
    input.style.cursor = 'text';
    input.style.boxSizing = 'border-box';

    const commit = (): void => {
      if (!editing) return;
      const next = input!.value.trim() || (props.placeholder ?? '');
      props.onChange(next);
      props.value.set(next);
      exitEdit();
    };

    const onKeyDown = (e: Event): void => {
      const k = e as KeyboardEvent;
      if (k.key === 'Enter' && !k.shiftKey) { 
        k.preventDefault(); 
        commit(); 
      }
      if (k.key === 'Escape') exitEdit();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', onKeyDown);

    span.style.display = 'none';
    wrapper.appendChild(input);
    input.focus();
    input.select();
  };

  const exitEdit = (): void => {
    if (!editing) return;
    editing = false;
    if (input) {
      input.removeEventListener('blur', () => {});
      input.removeEventListener('keydown', () => {});
      if (input.parentNode) input.parentNode.removeChild(input);
      input = null;
    }
    span.style.display = props.multiline ? '-webkit-box' : '';
  };

  span.addEventListener('dblclick', enterEdit);
  cleanups.push(() => span.removeEventListener('dblclick', enterEdit));

  // Prevent mousedown from bubbling out of wrapper ONLY when editing
  const stopMouseDown = (e: Event): void => { 
    if (editing) {
      e.stopPropagation(); 
    }
  };
  wrapper.addEventListener('mousedown', stopMouseDown);
  cleanups.push(() => wrapper.removeEventListener('mousedown', stopMouseDown));

  // Keep span text in sync with external signal changes
  const unsub = props.value.subscribe((v: string) => {
    const displayed = v || (props.placeholder ?? '');
    span.textContent = displayed;
    span.title = displayed;
    applyAdaptiveTypography(displayed);
    if (input) input.value = v;
  });
  cleanups.push(unsub);

  wrapper.appendChild(span);

  return {
    element: wrapper,
    cleanup: {
      destroy: () => {
        exitEdit();
        hidePopover();
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      }
    }
  };
};
