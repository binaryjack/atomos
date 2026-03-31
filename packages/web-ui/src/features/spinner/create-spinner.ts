import type { SpinnerProps, SpinnerResult } from './types/spinner.types.js';
export type { SpinnerProps, SpinnerResult };

const RING_SIZE: Record<string, string> = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

const PULSE_SIZE: Record<string, string> = {
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export const createSpinner = function(props: SpinnerProps): SpinnerResult {
  const size = props.size ?? 'md';

  const wrapper = document.createElement('div');
  wrapper.className = `flex flex-col items-center gap-4 ${props.className ?? ''}`;

  const relative = document.createElement('div');
  relative.style.position = 'relative';

  const ring = document.createElement('div');
  ring.className = `animate-spin rounded-full border-slate-700 border-t-purple-500 ${RING_SIZE[size]}`;
  relative.appendChild(ring);

  if (size !== 'xs' && size !== 'sm') {
    const pulseWrap = document.createElement('div');
    pulseWrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
    const dot = document.createElement('div');
    dot.className = `animate-pulse rounded-full bg-purple-500/20 ${PULSE_SIZE[size] ?? 'w-4 h-4'}`;
    pulseWrap.appendChild(dot);
    relative.appendChild(pulseWrap);
  }

  wrapper.appendChild(relative);

  if (props.label) {
    const lbl = document.createElement('p');
    lbl.className   = 'animate-pulse text-slate-400 text-sm';
    lbl.textContent = props.label;
    wrapper.appendChild(lbl);
  }

  let element: HTMLElement = wrapper;

  if (props.fullPage) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,0.95);backdrop-filter:blur(4px);';
    overlay.appendChild(wrapper);
    element = overlay;
  }

  return { element };
};
