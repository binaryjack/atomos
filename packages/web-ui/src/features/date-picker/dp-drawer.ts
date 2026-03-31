import { createSignal }            from '../../core/create-signal.js';
import { createDateObject, getTs } from './models.js';
import { computeDaysGrid, computeMonthsGrid, computeYearsGrid } from './computed.js';
import { getNextDate, getPreviousDate }                          from './getters.js';
import { createDpDrawerUi }        from './components/create-dp-drawer-ui.js';
import { DateFormatsEnum }         from './date-utils.js';
import type { DpContext }          from './dp-context.js';
import type { DatePickerGridModeType, DatePickerSelectionModeType } from './types/date-picker.types.js';
import type { IDateObject, IDatePickerRow } from './models.js';
import type { DpDrawerUiResult }   from './components/create-dp-drawer-ui.js';

export interface DpDrawerOptions {
  anchor:        HTMLElement;
  selectionMode: DatePickerSelectionModeType;
  format:        DateFormatsEnum;
  initialDate?:  Date;
  minDate?:      Date;
  maxDate?:      Date;
  disabled?:     boolean;
  onSelect?:     (ts: number, date: Date) => void;
  onRangeSelect?: (start: Date, end: Date) => void;
}

export interface DpDrawerResult {
  open():  void;
  close(): void;
  toggle(): void;
  destroy(): void;
  readonly isOpen: boolean;
}

export const createDpDrawer = function(opts: DpDrawerOptions): DpDrawerResult {
  const now    = new Date();
  const init   = opts.initialDate ?? now;
  const today  = createDateObject(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const initDO = createDateObject(init.getDate(), init.getMonth() + 1, init.getFullYear());

  // ── signals ──────────────────────────────────────────────────────────────
  const mode       = createSignal<DatePickerGridModeType>('DAY');
  const viewDate   = createSignal<IDateObject>(initDO);
  const todaySig   = createSignal<IDateObject>(today);
  const selectedTs = createSignal<number | null>(null);
  const rangeStart = createSignal<number | null>(null);
  const rangeEnd   = createSignal<number | null>(null);
  const isOpen     = createSignal<boolean>(false);
  const grid       = createSignal<IDatePickerRow[]>([]);

  const rebuildGrid = (): void => {
    const v  = viewDate.value;
    const t  = todaySig.value;
    const st = selectedTs.value ?? undefined;
    const rs = rangeStart.value ?? undefined;
    const re = rangeEnd.value   ?? undefined;

    switch (mode.value) {
      case 'DAY':   grid.set(computeDaysGrid(v, t, st, rs, re));   break;
      case 'MONTH': grid.set(computeMonthsGrid(v, t, st));         break;
      case 'YEAR':  grid.set(computeYearsGrid(v, t, st));          break;
    }
  };

  rebuildGrid();

  // ── context ───────────────────────────────────────────────────────────────
  const ctx: DpContext = {
    mode, viewDate, today: todaySig, selectedTs, rangeStart, rangeEnd, isOpen, grid,
    selectionMode: opts.selectionMode,
    format:        opts.format,
    ...(opts.minDate !== undefined && { minDate: opts.minDate }),
    ...(opts.maxDate !== undefined && { maxDate: opts.maxDate }),
    disabled: opts.disabled ?? false,

    selectCell(ts, day, month, year) {
      if (mode.value !== 'DAY') {
        if (mode.value === 'MONTH') {
          viewDate.set(createDateObject(viewDate.value.day, month, viewDate.value.year));
          mode.set('DAY');
        } else {
          viewDate.set(createDateObject(viewDate.value.day, viewDate.value.month, year));
          mode.set('MONTH');
        }
        rebuildGrid();
        return;
      }

      if (opts.selectionMode === 'single') {
        selectedTs.set(ts);
        opts.onSelect?.(ts, new Date(ts));
        close();
      } else {
        const rs = rangeStart.value;
        if (rs === null || rangeEnd.value !== null) {
          rangeStart.set(ts);
          rangeEnd.set(null);
          selectedTs.set(ts);
        } else {
          rangeEnd.set(ts);
          const [lo, hi] = ts >= rs ? [rs, ts] : [ts, rs];
          opts.onRangeSelect?.(new Date(lo), new Date(hi));
          close();
        }
      }
      rebuildGrid();
    },

    navigateNext() {
      viewDate.set(getNextDate(mode.value, viewDate.value));
      rebuildGrid();
    },
    navigatePrev() {
      viewDate.set(getPreviousDate(mode.value, viewDate.value));
      rebuildGrid();
    },
    switchMode(m) {
      mode.set(m);
      rebuildGrid();
    },
    open()   { open(); },
    close()  { close(); },
    toggle() { if (isOpen.value) close(); else open(); },
    clear()  {
      selectedTs.set(null);
      rangeStart.set(null);
      rangeEnd.set(null);
      rebuildGrid();
    },
  };

  // ── DOM ───────────────────────────────────────────────────────────────────
  let drawerUi:   DpDrawerUiResult | null = null;
  let popover:    HTMLDivElement   | null = null;

  const open = (): void => {
    if (isOpen.value) return;

    popover   = document.createElement('div');
    popover.className = 'dp-drawer fixed z-50';
    drawerUi  = createDpDrawerUi(ctx);
    popover.appendChild(drawerUi.element);
    document.body.appendChild(popover);

    positionPopover();

    isOpen.set(true);

    // close on outside click
    setTimeout(() => {
      document.addEventListener('click', outsideClick, { capture: true });
    }, 0);
  };

  const close = (): void => {
    if (!isOpen.value) return;
    document.removeEventListener('click', outsideClick, { capture: true });
    drawerUi?.destroy();
    drawerUi = null;
    popover?.remove();
    popover = null;
    isOpen.set(false);
  };

  const positionPopover = (): void => {
    if (!popover) return;
    const r = opts.anchor.getBoundingClientRect();
    popover.style.top  = `${r.bottom + window.scrollY + 4}px`;
    popover.style.left = `${r.left   + window.scrollX}px`;
  };

  const outsideClick = (e: MouseEvent): void => {
    const target = e.target as Node;
    if (popover && !popover.contains(target) && !opts.anchor.contains(target)) {
      close();
    }
  };

  const destroy = (): void => {
    close();
  };

  return {
    open,
    close,
    toggle() { if (isOpen.value) close(); else open(); },
    destroy,
    get isOpen() { return isOpen.value; },
  };
};
