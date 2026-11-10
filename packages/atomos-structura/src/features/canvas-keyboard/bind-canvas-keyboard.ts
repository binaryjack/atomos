// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Editing commands triggered by keyboard shortcuts on one canvas host. */
export interface CanvasKeyboardActions {
  readonly undo: () => void;
  readonly redo: () => void;
  readonly deleteSelection: () => void;
  readonly copy: () => void;
  readonly paste: () => void;
  readonly selectAll: () => void;
  readonly escape: () => void;
  readonly showShortcuts?: () => void;
}

/** The shortcuts actually implemented — the shortcuts panel lists exactly these. */
export const CANVAS_SHORTCUTS: ReadonlyArray<{ readonly keys: readonly string[]; readonly description: string }> = [
  { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo' },
  { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl/Cmd', 'Y'], description: 'Redo' },
  { keys: ['Ctrl/Cmd', 'C'], description: 'Copy selection' },
  { keys: ['Ctrl/Cmd', 'V'], description: 'Paste (new ids, inner links kept)' },
  { keys: ['Ctrl/Cmd', 'A'], description: 'Select all nodes' },
  { keys: ['Delete / Backspace'], description: 'Delete selection' },
  { keys: ['Escape'], description: 'Cancel connection / clear selection' },
  { keys: ['Shift', 'Click'], description: 'Toggle node in selection' },
  { keys: ['Shift', 'Drag canvas'], description: 'Rubber-band multi-select' },
  { keys: ['?'], description: 'Show this shortcuts panel' },
];

const isEditableTarget = (event: Event): boolean => {
  const target = (event.composedPath?.()[0] ?? event.target) as HTMLElement | null;
  if (!target || typeof target.tagName !== 'string') return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable === true;
};

const resolveCommand = (event: KeyboardEvent, actions: CanvasKeyboardActions): (() => void) | undefined => {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (!mod) {
    if (key === 'delete' || key === 'backspace') return actions.deleteSelection;
    if (key === 'escape') return actions.escape;
    return key === '?' ? actions.showShortcuts : undefined;
  }
  if (key === 'z') return event.shiftKey ? actions.redo : actions.undo;
  const byKey: Record<string, () => void> = { y: actions.redo, c: actions.copy, v: actions.paste, a: actions.selectAll };
  return byKey[key];
};

/**
 * Binds the editing shortcuts to the canvas host element only (focusable via tabindex),
 * never to `document`: several canvases on one page never interfere. Text inputs inside
 * the canvas keep their native shortcuts. Returns an unbind function.
 */
export const bindCanvasKeyboard = (host: HTMLElement, actions: CanvasKeyboardActions): (() => void) => {
  if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
  const onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event)) return;
    const command = resolveCommand(event, actions);
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    command();
  };
  // Clicking the canvas gives it keyboard focus without scrolling the page.
  const onPointerDown = (event: PointerEvent): void => {
    if (isEditableTarget(event)) return;
    const active = host.getRootNode() instanceof Document ? document.activeElement : null;
    if (active !== host && !host.contains(active)) host.focus({ preventScroll: true });
  };
  host.addEventListener('keydown', onKeyDown);
  host.addEventListener('pointerdown', onPointerDown);
  return () => {
    host.removeEventListener('keydown', onKeyDown);
    host.removeEventListener('pointerdown', onPointerDown);
  };
};
