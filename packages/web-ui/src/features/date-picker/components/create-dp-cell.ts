import type { IDatePickerCell } from '../models.js';
import type { DpContext }       from '../dp-context.js';
import { MONTHS }               from '../models.js';

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
    'w-8', 'h-8', 'rounded', 'text-sm', 'transition-colors',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-400',
  ];

  if (cell.displayType !== 'current') base.push('text-gray-400');
  if (cell.isToday)    base.push('font-bold', 'ring-1', 'ring-blue-400');
  if (cell.isSelected) base.push('bg-blue-600', 'text-white');
  if (cell.isInRange)  base.push('bg-blue-100', 'text-blue-800');
  if (cell.isRangeEnd) base.push('bg-blue-500', 'text-white');
  if (cell.isWeekEnd && !cell.isSelected && !cell.isRangeEnd)
    base.push('text-red-500');
  if (cell.isDisabled) base.push('opacity-40', 'cursor-not-allowed');
  else                 base.push('hover:bg-blue-50', 'cursor-pointer');

  btn.className = base.join(' ');
};
