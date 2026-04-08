export interface ShortcutsPanelResult {
  readonly open: () => void;
  readonly close: () => void;
  readonly cleanup: { destroy: () => void };
}

const SHORTCUTS: ReadonlyArray<{ keys: readonly string[]; description: string }> = [
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Y'], description: 'Redo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alt)' },
  { keys: ['Ctrl', 'K'], description: 'Search entities' },
  { keys: ['Ctrl', 'C'], description: 'Copy selected entity' },
  { keys: ['Ctrl', 'V'], description: 'Paste entity' },
  { keys: ['Delete'], description: 'Delete selected/multi-selected' },
  { keys: ['Drag', 'canvas'], description: 'Rubber-band multi-select' },
  { keys: ['Escape'], description: 'Cancel link drawing' },
  { keys: ['Shift', '?'], description: 'Open this shortcuts panel' },
];

export const createShortcutsPanel = (): ShortcutsPanelResult => {
  let active = false;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = [
    'position:fixed;inset:0;z-index:1000;',
    'background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);',
    'display:none;align-items:center;justify-content:center;',
  ].join('');

  const panel = document.createElement('div');
  panel.style.cssText = [
    'background:rgba(15,23,42,0.98);border:1px solid #27272a;border-radius:12px;',
    'padding:24px 28px;min-width:440px;max-width:580px;',
    'box-shadow:0 20px 60px rgba(0,0,0,0.5);',
    'font-family:system-ui,sans-serif;color:#f4f4f5;',
  ].join('');

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:18px;color:#f8fafc;';
  title.textContent = 'Keyboard Shortcuts';

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

  SHORTCUTS.forEach(({ keys, description }) => {
    const row = document.createElement('div');
    row.style.cssText = [
      'display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.04);',
    ].join('');

    const desc = document.createElement('span');
    desc.style.cssText = 'font-size:12px;color:#a1a1aa;';
    desc.textContent = description;

    const keysWrap = document.createElement('span');
    keysWrap.style.cssText = 'display:flex;align-items:center;gap:3px;flex-shrink:0;';
    keys.forEach((k, i) => {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.style.cssText = 'font-size:10px;color:#52525b;';
        plus.textContent = '+';
        keysWrap.appendChild(plus);
      }
      const kbd = document.createElement('kbd');
      kbd.style.cssText = [
        'font-size:10px;padding:2px 5px;border-radius:4px;',
        'background:#1e293b;border:1px solid #334155;color:#cbd5e1;',
        'font-family:ui-monospace,monospace;',
      ].join('');
      kbd.textContent = k;
      keysWrap.appendChild(kbd);
    });

    row.appendChild(desc);
    row.appendChild(keysWrap);
    grid.appendChild(row);
  });

  const hint = document.createElement('div');
  hint.style.cssText = 'margin-top:16px;font-size:11px;color:#3f3f46;text-align:center;';
  hint.textContent = 'Press Escape or click outside to close';

  panel.appendChild(title);
  panel.appendChild(grid);
  panel.appendChild(hint);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  const open = (): void => {
    active = true;
    backdrop.style.display = 'flex';
  };

  const close = (): void => {
    active = false;
    backdrop.style.display = 'none';
  };

  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

  const onKeyDown = (e: KeyboardEvent): void => {
    if (active && e.key === 'Escape') { e.preventDefault(); close(); }
  };
  document.addEventListener('keydown', onKeyDown);

  return {
    open,
    close,
    cleanup: {
      destroy: () => {
        document.removeEventListener('keydown', onKeyDown);
        backdrop.remove();
      },
    },
  };
};
