import type { ToggleProps, ToggleResult } from './types/toggle.types.js';
export type { ToggleProps, ToggleResult };

const TRACK: Record<string, { track: string; thumb: string; on: string; off: string }> = {
  sm: { track: 'w-7 h-4',   thumb: 'w-3 h-3',   on: 'translate-x-3',   off: 'translate-x-0.5' },
  md: { track: 'w-9 h-5',   thumb: 'w-4 h-4',   on: 'translate-x-4',   off: 'translate-x-0.5' },
  lg: { track: 'w-11 h-6',  thumb: 'w-5 h-5',   on: 'translate-x-5',   off: 'translate-x-0.5' },
};

export const createToggle = function(props: ToggleProps): ToggleResult {
  const cleanupFunctions: Array<() => void> = [];
  const size = props.size ?? 'md';
  const cfg  = TRACK[size] ?? TRACK['md']!

  // ── root
  const root = document.createElement('div');
  root.className = `inline-flex items-center gap-2 ${props.className ?? ''}`;
  if (props.id) root.id = props.id;

  // ── hidden input (accessibility)
  const input = document.createElement('input');
  input.type  = 'checkbox';
  input.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
  if (props.id) input.id = `${props.id}-input`;

  // ── track
  const track = document.createElement('span');
  track.style.cssText = 'position:relative;display:inline-flex;align-items:center;border-radius:9999px;cursor:pointer;transition:background-color .2s;flex-shrink:0;';
  track.className = cfg.track;

  // ── thumb
  const thumb = document.createElement('span');
  thumb.style.cssText = 'position:absolute;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .2s;pointer-events:none;';
  thumb.className = cfg.thumb;
  track.appendChild(thumb);

  let checked = false;

  const resolveDisabled = (): boolean => {
    const d = props.disabled;
    if (!d) return false;
    return typeof d === 'boolean' ? d : d.value;
  };

  const applyState = (on: boolean): void => {
    checked = on;
    input.checked = on;
    const disabled = resolveDisabled();
    if (disabled) {
      track.style.background = '#374151';
      thumb.style.background = '#9ca3af';
    } else if (on) {
      track.style.background = props.error ? '#dc2626' : '#2563eb';
      thumb.style.background = '#fff';
    } else {
      track.style.background = '#4b5563';
      thumb.style.background = '#fff';
    }
    thumb.className = `${cfg.thumb} transform ${on ? cfg.on : cfg.off}`;
  };

  // initialise
  const initChecked = typeof props.checked === 'boolean' ? props.checked : (props.checked?.value ?? false);
  applyState(initChecked);

  // reactive checked
  if (props.checked && typeof props.checked !== 'boolean') {
    cleanupFunctions.push(props.checked.subscribe(applyState));
  }

  // reactive disabled
  if (props.disabled && typeof props.disabled !== 'boolean') {
    cleanupFunctions.push(props.disabled.subscribe(() => applyState(checked)));
  }

  // click
  track.addEventListener('click', () => {
    if (resolveDisabled()) return;
    applyState(!checked);
    props.onChange?.(!checked);
  });

  // ── optional label
  const buildLabel = (): HTMLElement => {
    const lbl = document.createElement('span');
    lbl.className   = `text-sm font-medium ${resolveDisabled() ? 'text-slate-500' : 'text-slate-200'}`;
    lbl.textContent = props.label ?? '';
    lbl.style.cursor = resolveDisabled() ? 'not-allowed' : 'pointer';
    lbl.addEventListener('click', () => track.click());
    return lbl;
  };

  root.appendChild(input);
  if (props.label && props.labelPosition === 'left') root.appendChild(buildLabel());
  root.appendChild(track);
  if (props.label && props.labelPosition !== 'left')  root.appendChild(buildLabel());

  return {
    element:    root,
    getChecked: () => checked,
    cleanup:    { destroy: () => cleanupFunctions.forEach(fn => fn()) },
  };
};
