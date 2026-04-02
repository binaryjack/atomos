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
  wrapper.style.flex = '1';

  // Label span (view mode)
  const span = document.createElement('span');
  span.style.overflow = 'hidden';
  span.style.textOverflow = 'ellipsis';
  span.style.whiteSpace = 'nowrap';
  span.style.cursor = 'inherit';
  span.style.userSelect = 'none';
  span.style.flex = '1';
  span.style.minWidth = '0';
  span.textContent = props.value.value || (props.placeholder ?? '');

  // Input (edit mode) — created lazily
  let input: HTMLInputElement | null = null;
  let editing = false;

  const enterEdit = (): void => {
    if (editing) return;
    editing = true;

    input = document.createElement('input');
    input.type = 'text';
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
    input.style.padding = '0 2px';
    input.style.font = 'inherit';
    input.style.color = '#f1f5f9';
    input.style.cursor = 'text';

    const commit = (): void => {
      if (!editing) return;
      const next = input!.value.trim() || (props.placeholder ?? '');
      props.onChange(next);
      props.value.set(next);
      exitEdit();
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') exitEdit();
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
    span.style.display = '';
  };

  span.addEventListener('dblclick', enterEdit);
  cleanups.push(() => span.removeEventListener('dblclick', enterEdit));

  // Prevent mousedown from bubbling out of wrapper (e.g. into SVG drag handler)
  const stopMouseDown = (e: Event): void => { e.stopPropagation(); };
  wrapper.addEventListener('mousedown', stopMouseDown);
  cleanups.push(() => wrapper.removeEventListener('mousedown', stopMouseDown));

  // Keep span text in sync with external signal changes
  const unsub = props.value.subscribe((v: string) => {
    span.textContent = v || (props.placeholder ?? '');
    if (input) input.value = v;
  });
  cleanups.push(unsub);

  wrapper.appendChild(span);

  return {
    element: wrapper,
    cleanup: {
      destroy: () => {
        exitEdit();
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      }
    }
  };
};
