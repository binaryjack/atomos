import type { DpContext }    from '../dp-context.js';
import { createDpCell }      from './create-dp-cell.js';
import type { DpCellResult } from './create-dp-cell.js';

export interface DpBodyMonthsResult {
  element: HTMLDivElement;
  destroy: () => void;
}

export const createDpBodyMonths = function(ctx: DpContext): DpBodyMonthsResult {
  const el = document.createElement('div');
  el.className = 'dp-body-months select-none';

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
      rowEl.className = 'grid grid-cols-3 gap-1';
      for (const cell of row.cells) {
        const cr = createDpCell(cell, ctx);
        cr.element.className = cr.element.className.replace('w-8 h-8', 'w-full h-10');
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
