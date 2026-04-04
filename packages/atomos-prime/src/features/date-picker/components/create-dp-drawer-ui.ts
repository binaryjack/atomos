import type { DpContext } from '../dp-context.js'
import type { DpBodyDaysResult } from './create-dp-body-days.js'
import { createDpBodyDays } from './create-dp-body-days.js'
import type { DpBodyMonthsResult } from './create-dp-body-months.js'
import { createDpBodyMonths } from './create-dp-body-months.js'
import type { DpBodyYearsResult } from './create-dp-body-years.js'
import { createDpBodyYears } from './create-dp-body-years.js'
import type { DpHeaderResult } from './create-dp-header.js'
import { createDpHeader } from './create-dp-header.js'

export interface DpDrawerUiResult {
  element: HTMLDivElement;
  destroy: () => void;
}

export const createDpDrawerUi = function(ctx: DpContext): DpDrawerUiResult {
  const el = document.createElement('div');
  el.className = [
    'dp-drawer-ui',
    'bg-[var(--vbs-bg-panel,#ffffff)]', 'text-[var(--vbs-text-primary,#111111)]', 'rounded-[var(--vbs-radius,12px)]', 'shadow-lg', 'border', 'border-[var(--vbs-border,#e5e7eb)]',
  ].join(' ');

  let header:      DpHeaderResult     | null = createDpHeader(ctx);
  let bodyDays:    DpBodyDaysResult   | null = null;
  let bodyMonths:  DpBodyMonthsResult | null = null;
  let bodyYears:   DpBodyYearsResult  | null = null;

  const bodyEl = document.createElement('div');
  bodyEl.className = 'dp-body mt-2';

  el.appendChild(header.element);
  el.appendChild(bodyEl);

  const renderBody = (): void => {
    bodyDays?.destroy();   bodyDays   = null;
    bodyMonths?.destroy(); bodyMonths = null;
    bodyYears?.destroy();  bodyYears  = null;
    bodyEl.innerHTML = '';

    switch (ctx.mode.value) {
      case 'DAY':
        bodyDays = createDpBodyDays(ctx);
        bodyEl.appendChild(bodyDays.element);
        break;
      case 'MONTH':
        bodyMonths = createDpBodyMonths(ctx);
        bodyEl.appendChild(bodyMonths.element);
        break;
      case 'YEAR':
        bodyYears = createDpBodyYears(ctx);
        bodyEl.appendChild(bodyYears.element);
        break;
    }
  };

  renderBody();
  const unsubMode = ctx.mode.subscribe(renderBody);

  const destroy = (): void => {
    unsubMode();
    header?.destroy();   header   = null;
    bodyDays?.destroy(); bodyDays = null;
    bodyMonths?.destroy(); bodyMonths = null;
    bodyYears?.destroy();  bodyYears  = null;
  };

  return { element: el, destroy };
};
