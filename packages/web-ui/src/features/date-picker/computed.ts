import { createCell, newCellsRow } from './constructors.js';
import { getTs }                   from './models.js';
import type { IDateObject, IDatePickerRow } from './models.js';

const DAYS_PER_WEEK = 7;
const WEEKS_IN_GRID = 6;

export const computeDaysGrid = function(
  ref:         IDateObject,
  today:       IDateObject,
  selectedTs?: number,
  rangeStartTs?: number,
  rangeEndTs?:   number,
): IDatePickerRow[] {
  const rows: IDatePickerRow[] = [];

  const firstDayOfMonth = new Date(ref.year, ref.month - 1, 1).getDay();
  const daysInMonth     = new Date(ref.year, ref.month, 0).getDate();
  const prevMonthDate   = new Date(ref.year, ref.month - 1, 0);
  const daysInPrevMonth = prevMonthDate.getDate();

  const todayTs = getTs(today);

  let row = newCellsRow(`row-0`, []);
  let col = 0;
  let rowIdx = 0;

  // leading cells from prev month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d     = daysInPrevMonth - i;
    const prevM = ref.month === 1 ? 12 : ref.month - 1;
    const prevY = ref.month === 1 ? ref.year - 1 : ref.year;
    const ts    = getTs({ day: d, month: prevM, year: prevY });
    row.cells.push(createCell(d, prevM, prevY, {
      displayType: 'previous',
      isWeekEnd:   col === 0 || col === 6,
      isToday:     ts === todayTs,
      isSelected:  selectedTs !== undefined && ts === selectedTs,
      isInRange:   isInRange(ts, rangeStartTs, rangeEndTs),
      isRangeEnd:  isRangeEnd(ts, rangeStartTs, rangeEndTs),
    }));
    col++;
  }

  // current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    if (col === DAYS_PER_WEEK) {
      rows.push(row);
      rowIdx++;
      row = newCellsRow(`row-${rowIdx}`, []);
      col = 0;
    }
    const ts = getTs({ day: d, month: ref.month, year: ref.year });
    row.cells.push(createCell(d, ref.month, ref.year, {
      displayType: 'current',
      isWeekEnd:   col === 0 || col === 6,
      isToday:     ts === todayTs,
      isSelected:  selectedTs !== undefined && ts === selectedTs,
      isInRange:   isInRange(ts, rangeStartTs, rangeEndTs),
      isRangeEnd:  isRangeEnd(ts, rangeStartTs, rangeEndTs),
    }));
    col++;
  }

  // trailing cells from next month
  const nextM = ref.month === 12 ? 1  : ref.month + 1;
  const nextY = ref.month === 12 ? ref.year + 1 : ref.year;
  let nextD   = 1;

  while (rows.length < WEEKS_IN_GRID - 1 || (row.cells.length > 0 && row.cells.length < DAYS_PER_WEEK)) {
    if (col === DAYS_PER_WEEK) {
      rows.push(row);
      rowIdx++;
      row = newCellsRow(`row-${rowIdx}`, []);
      col = 0;
    }
    if (rows.length >= WEEKS_IN_GRID) break;
    const ts = getTs({ day: nextD, month: nextM, year: nextY });
    row.cells.push(createCell(nextD, nextM, nextY, {
      displayType: 'next',
      isWeekEnd:   col === 0 || col === 6,
      isToday:     ts === todayTs,
      isSelected:  selectedTs !== undefined && ts === selectedTs,
      isInRange:   isInRange(ts, rangeStartTs, rangeEndTs),
      isRangeEnd:  isRangeEnd(ts, rangeStartTs, rangeEndTs),
    }));
    nextD++;
    col++;
  }

  if (row.cells.length > 0) rows.push(row);

  return rows;
};

export const computeMonthsGrid = function(
  ref:       IDateObject,
  today:     IDateObject,
  selectedTs?: number,
): IDatePickerRow[] {
  const rows: IDatePickerRow[] = [];
  const todayMonthTs = getTs({ day: 1, month: today.month, year: today.year });

  let row = newCellsRow('m-row-0', []);
  for (let m = 1; m <= 12; m++) {
    if ((m - 1) % 3 === 0 && m > 1) {
      rows.push(row);
      row = newCellsRow(`m-row-${rows.length}`, []);
    }
    const ts = getTs({ day: 1, month: m, year: ref.year });
    row.cells.push(createCell(1, m, ref.year, {
      displayType: 'current',
      isToday:     ts === todayMonthTs,
      isSelected:  selectedTs !== undefined && ts === selectedTs,
    }));
  }
  rows.push(row);
  return rows;
};

export const computeYearsGrid = function(
  ref:       IDateObject,
  today:     IDateObject,
  selectedTs?: number,
): IDatePickerRow[] {
  const startYear = Math.floor(ref.year / 12) * 12;
  const rows: IDatePickerRow[] = [];

  let row = newCellsRow('y-row-0', []);
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 3 === 0) {
      rows.push(row);
      row = newCellsRow(`y-row-${rows.length}`, []);
    }
    const y  = startYear + i;
    const ts = getTs({ day: 1, month: 1, year: y });
    row.cells.push(createCell(1, 1, y, {
      displayType: 'current',
      isToday:     y === today.year,
      isSelected:  selectedTs !== undefined && ts === selectedTs,
    }));
  }
  rows.push(row);
  return rows;
};

export const computeRange = function(
  startTs: number,
  endTs:   number,
): [number, number] {
  return startTs <= endTs ? [startTs, endTs] : [endTs, startTs];
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const isInRange = function(
  ts:           number,
  rangeStartTs: number | undefined,
  rangeEndTs:   number | undefined,
): boolean {
  if (rangeStartTs === undefined || rangeEndTs === undefined) return false;
  const [lo, hi] = computeRange(rangeStartTs, rangeEndTs);
  return ts > lo && ts < hi;
};

const isRangeEnd = function(
  ts:           number,
  rangeStartTs: number | undefined,
  rangeEndTs:   number | undefined,
): boolean {
  if (rangeStartTs === undefined || rangeEndTs === undefined) return false;
  return ts === rangeStartTs || ts === rangeEndTs;
};
