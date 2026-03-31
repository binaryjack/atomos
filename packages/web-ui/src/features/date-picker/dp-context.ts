import type { Signal }                     from '../../core/types/signal.types.js';
import type { DatePickerGridModeType, DatePickerSelectionModeType } from './types/date-picker.types.js';
import type { IDateObject, IDatePickerRow } from './models.js';
import type { DateFormatsEnum }            from './date-utils.js';

export interface DpContext {
  // ── state signals ──────────────────────────────────────────────────────────
  readonly mode:       Signal<DatePickerGridModeType>;
  readonly viewDate:   Signal<IDateObject>;
  readonly today:      Signal<IDateObject>;
  readonly selectedTs: Signal<number | null>;
  readonly rangeStart: Signal<number | null>;
  readonly rangeEnd:   Signal<number | null>;
  readonly isOpen:     Signal<boolean>;
  readonly grid:       Signal<IDatePickerRow[]>;

  // ── config (immutable after init) ─────────────────────────────────────────
  readonly selectionMode: DatePickerSelectionModeType;
  readonly format:        DateFormatsEnum;
  readonly minDate?:      Date;
  readonly maxDate?:      Date;
  readonly disabled:      boolean;

  // ── actions ────────────────────────────────────────────────────────────────
  selectCell(ts: number, day: number, month: number, year: number): void;
  navigateNext(): void;
  navigatePrev(): void;
  switchMode(mode: DatePickerGridModeType): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
}
