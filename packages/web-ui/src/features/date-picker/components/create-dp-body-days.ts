import type { DpContext }            from '../dp-context.js';
import { createDpCell }              from './create-dp-cell.js';
import type { DpCellResult }         from './create-dp-cell.js';
import { WEEK_DAYS }                 from '../models.js';

export interface DpBodyDaysResult {
  element: HTMLDivElement;
  destroy: () => void;
}

export const createDpBodyDays = function(ctx: DpContext): DpBodyDaysResult {
  const el = document.createElement('div');
  el.className = 'dp-body-days select-none';

  // week-day header row
  const headerRow = document.createElement('div');
  headerRow.className = 'grid grid-cols-7 mb-1';
  for (const wd of WEEK_DAYS) {
    const cell = document.createElement('span');
    cell.textContent = wd.shortName;
    cell.className = 'text-center text-xs font-medium text-gray-500 py-1';
    headerRow.appendChild(cell);
  }
  el.appendChild(headerRow);

  const gridEl = document.createElement('div');
  gridEl.className = 'dp-grid';
  el.appendChild(gridEl);

  let cellResults: DpCellResult[] = [];

  const render = (): void => {
    for (const cr of cellResults) cr.destroy();
    cellResults = [];
    gridEl.innerHTML = '';

    for (const row of ctx.grid.value) {
      const rowEl = document.createElement('div');
      rowEl.className = 'grid grid-cols-7';
      for (const cell of row.cells) {
        const cr = createDpCell(cell, ctx);
        cellResults.push(cr);
        rowEl.appendChild(cr.element);
      }
      gridEl.appendChild(rowEl);
    }
  };

  render();
  const unsubGrid = ctx.grid.subscribe(render);

  const destroy = (): void => {
    unsubGrid();
    for (const cr of cellResults) cr.destroy();
    cellResults = [];
  };

  return { element: el, destroy };
};
