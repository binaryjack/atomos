import type { StickyNoteEntity } from '@atomos-web/structura-core';

export interface StickyNoteProps {
  readonly note: StickyNoteEntity;
  readonly isReadonly?: boolean;
  readonly onChange?: (content: string) => void;
  readonly onDelete?: () => void;
}

export interface StickyNoteResult {
  readonly rootElement: SVGGElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly updatePosition: (x: number, y: number) => void;
  readonly cleanup: { destroy: () => void };
}

export const createStickyNote = (props: StickyNoteProps): StickyNoteResult => {
  const cleanups: Array<() => void> = [];
  const rootElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rootElement.classList.add('vbs-sticky-note');
  rootElement.dataset.noteId = props.note.id;

  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('x', '0');
  fo.setAttribute('y', '0');
  fo.setAttribute('width', String(props.note.dimensions.width));
  fo.setAttribute('height', String(props.note.dimensions.height));
  fo.style.overflow = 'visible';

  const noteCard = document.createElement('div');
  const bg = props.note.noteColor || '#fef08a';
  noteCard.style.cssText = [
    `background: ${bg};`,
    'color: #1e293b;',
    'width: 100%;',
    'height: 100%;',
    'border-radius: 8px;',
    'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -4px rgba(0, 0, 0, 0.2);',
    'display: flex;',
    'flex-direction: column;',
    'box-sizing: border-box;',
    'overflow: hidden;',
    'font-family: system-ui, -apple-system, sans-serif;',
    'border: 1px solid rgba(0, 0, 0, 0.1);',
  ].join('');

  // Top header bar
  const header = document.createElement('div');
  header.style.cssText = [
    'display: flex;',
    'align-items: center;',
    'justify-content: space-between;',
    'padding: 6px 10px;',
    'background: rgba(0, 0, 0, 0.06);',
    'cursor: grab;',
    'user-select: none;',
  ].join('');

  const title = document.createElement('span');
  title.textContent = '📌 Architecture Note';
  title.style.cssText = 'font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;';
  header.appendChild(title);

  if (!props.isReadonly && props.onDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete note';
    deleteBtn.style.cssText = [
      'background: transparent;',
      'border: none;',
      'font-size: 16px;',
      'line-height: 1;',
      'cursor: pointer;',
      'color: #64748b;',
      'padding: 0 4px;',
      'border-radius: 4px;',
    ].join('');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      props.onDelete?.();
    });
    header.appendChild(deleteBtn);
  }

  noteCard.appendChild(header);

  // Content textarea / preview
  const body = document.createElement('div');
  body.style.cssText = 'flex: 1; padding: 10px; display: flex; flex-direction: column; overflow: hidden;';

  const textarea = document.createElement('textarea');
  textarea.value = props.note.content || '';
  textarea.placeholder = 'Type architectural note or ADR summary...';
  textarea.style.cssText = [
    'flex: 1;',
    'width: 100%;',
    'background: transparent;',
    'border: none;',
    'resize: none;',
    'outline: none;',
    'font-size: 12px;',
    'line-height: 1.4;',
    'color: #0f172a;',
    'font-family: inherit;',
    'box-sizing: border-box;',
  ].join('');

  if (props.isReadonly) {
    textarea.readOnly = true;
  } else {
    textarea.addEventListener('input', () => {
      props.onChange?.(textarea.value);
    });
  }

  body.appendChild(textarea);
  noteCard.appendChild(body);
  fo.appendChild(noteCard);
  rootElement.appendChild(fo);

  const updateSize = (width: number, height: number): void => {
    fo.setAttribute('width', String(width));
    fo.setAttribute('height', String(height));
  };

  const updatePosition = (x: number, y: number): void => {
    rootElement.setAttribute('transform', `translate(${x}, ${y})`);
  };

  updatePosition(props.note.position.x, props.note.position.y);

  return {
    rootElement,
    updateSize,
    updatePosition,
    cleanup: {
      destroy: () => {
        cleanups.forEach(fn => fn());
        rootElement.remove();
      },
    },
  };
};
