import type { DpContext }           from '../dp-context.js';
import type { DatePickerGridModeType } from '../types/date-picker.types.js';
import { MONTHS }                   from '../models.js';

export interface DpSwitchResult {
  element: HTMLButtonElement;
  destroy: () => void;
}

export const createDpSwitch = function(ctx: DpContext): DpSwitchResult {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'dp-switch', 'font-semibold', 'text-sm', 'px-2', 'py-1',
    'rounded', 'hover:bg-gray-100', 'transition-colors',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-400',
  ].join(' ');

  const render = (): void => {
    btn.textContent = buildLabel(ctx);
  };

  render();

  const handleClick = (): void => {
    const next: DatePickerGridModeType =
      ctx.mode.value === 'DAY' ? 'MONTH' :
      ctx.mode.value === 'MONTH' ? 'YEAR' : 'DAY';
    ctx.switchMode(next);
  };

  btn.addEventListener('click', handleClick);

  const unsubMode = ctx.mode.subscribe(render);
  const unsubView = ctx.viewDate.subscribe(render);

  const destroy = (): void => {
    btn.removeEventListener('click', handleClick);
    unsubMode();
    unsubView();
  };

  return { element: btn, destroy };
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const buildLabel = function(ctx: DpContext): string {
  const v = ctx.viewDate.value;
  switch (ctx.mode.value) {
    case 'DAY':
      return `${MONTHS[v.month - 1]?.label ?? ''} ${v.year}`;
    case 'MONTH':
      return String(v.year);
    case 'YEAR': {
      const start = Math.floor(v.year / 12) * 12;
      return `${start} – ${start + 11}`;
    }
  }
};
