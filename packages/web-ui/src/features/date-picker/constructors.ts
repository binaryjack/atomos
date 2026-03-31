import type { DatePickerDisplayType } from './types/date-picker.types.js';
import { createDateObject, getTs } from './models.js';
import type { IDatePickerCell, IDateObject, IDatePickerRow } from './models.js';

let _cellSeq = 0;

export const newCell = function(): IDatePickerCell {
  return {
    id:          '',
    code:        '',
    ts:          0,
    item:        createDateObject(0, 0, 0),
    displayType: 'current',
    isToday:     false,
    isWeekEnd:   false,
    isSelected:  false,
    isInRange:   false,
    isRangeEnd:  false,
    isDisabled:  false,
  };
};

export interface CreateCellOptions {
  displayType?: DatePickerDisplayType;
  isToday?:     boolean;
  isWeekEnd?:   boolean;
  isSelected?:  boolean;
  isInRange?:   boolean;
  isRangeEnd?:  boolean;
  isDisabled?:  boolean;
}

export const createCell = function(
  day:     number,
  month:   number,
  year:    number,
  options: CreateCellOptions = {},
): IDatePickerCell {
  const item: IDateObject = createDateObject(day, month, year);
  const ts   = getTs(item);
  const id   = `cell-${++_cellSeq}`;
  const code = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    id,
    code,
    ts,
    item,
    displayType: options.displayType ?? 'current',
    isToday:     options.isToday    ?? false,
    isWeekEnd:   options.isWeekEnd  ?? false,
    isSelected:  options.isSelected ?? false,
    isInRange:   options.isInRange  ?? false,
    isRangeEnd:  options.isRangeEnd ?? false,
    isDisabled:  options.isDisabled ?? false,
  };
};

export const newCellsRow = function(id: string, cells: IDatePickerCell[] = []): IDatePickerRow {
  return { id, cells };
};
