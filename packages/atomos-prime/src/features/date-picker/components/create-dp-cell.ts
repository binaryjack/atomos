import type { DpContext } from '../dp-context.js'
import type { IDatePickerCell } from '../models.js'
import { MONTHS } from '../models.js'

export interface DpCellResult {
  element: HTMLButtonElement;
  destroy: () => void;
}

export const createDpCell = function(
  cell: IDatePickerCell,
  ctx:  DpContext,
): DpCellResult {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset['cellId'] = cell.id;

  const label = buildLabel(cell, ctx);
  btn.textContent = label;

  applyClasses(btn, cell);

  const handleClick = (): void => {
    if (cell.isDisabled) return;
    ctx.selectCell(cell.ts, cell.item.day, cell.item.month, cell.item.year);    
  };

  btn.addEventListener('click', handleClick);

  const unsub = ctx.selectedTs.subscribe(() => {
    const updated = ctx.grid.value
      .flatMap(r => r.cells)
      .find(c => c.id === cell.id);
    if (updated) applyClasses(btn, updated);
  });

  const destroy = (): void => {
    btn.removeEventListener('click', handleClick);
    unsub();
  };

  return { element: btn, destroy };
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const buildLabel = function(cell: IDatePickerCell, ctx: DpContext): string {    
  switch (ctx.mode.value) {
    case 'DAY':   return String(cell.item.day);
    case 'MONTH': return MONTHS[cell.item.month - 1]?.shortName ?? String(cell.item.month);
    case 'YEAR':  return String(cell.item.year);
  }
};

const applyClasses = function(btn: HTMLButtonElement, cell: IDatePickerCell): void {
  const base: string[] = [
    'dp-cell',
    'inline-flex', 'items-center', 'justify-center',
    'w-8', 'h-8', 'rounded-[var(--vbs-radius,4px)]', 'text-sm', 'transition-colors',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-[var(--vbs-primary,#3b82f6)]', 'text-[var(--vbs-text-primary,#f4f4f5)]'
  ];

  if (cell.displayType !== 'current') base.push('opacity-50', 'text-[var(--vbs-text-secondary,#a1a1aa)]');
  if (cell.isToday)    base.push('font-bold', 'ring-1', 'ring-[var(--vbs-primary,#3b82f6)]');
  if (cell.isSelected) base.push('bg-[var(--vbs-primary,#3b82f6)]', '!text-[#fff]');
  if (cell.isInRange)  base.push('bg-[color-mix(in_srgb,var(--vbs-primary,#3b82f6)_20%,transparent)]');
  if (cell.isRangeEnd) base.push('bg-[var(--vbs-primary,#3b82f6)]', '!text-[#fff]');
  if (cell.isWeekEnd && !cell.isSelected && !cell.isRangeEnd)
    base.push('text-[var(--vbs-danger,#ef4444)]');
  if (cell.isDisabled) base.push('opacity-40', 'cursor-not-allowed');
  else                 base.push('hover:bg-[var(--vbs-hover,rgba(255,255,255,0.05))]', 'cursor-pointer');

  btn.className = base.join(' ');
};
