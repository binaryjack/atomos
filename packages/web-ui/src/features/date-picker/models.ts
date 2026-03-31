import type { DatePickerDisplayType } from './types/date-picker.types.js';

export interface IDateObject {
  day:   number;
  month: number;
  year:  number;
}

export interface IDatePickerItem {
  value:     number;
  label:     string;
  shortName: string;
}

export interface IDatePickerCell {
  id:          string;
  code:        string;
  ts:          number;
  item:        IDateObject;
  displayType: DatePickerDisplayType;
  isToday:     boolean;
  isWeekEnd:   boolean;
  isSelected:  boolean;
  isInRange:   boolean;
  isRangeEnd:  boolean;
  isDisabled:  boolean;
}

export interface IDatePickerRow {
  id:    string;
  cells: IDatePickerCell[];
}

export const createDateObject = function(
  day:   number,
  month: number,
  year:  number,
): IDateObject {
  return { day, month, year };
};

export const getTs = function(d: IDateObject): number {
  return new Date(d.year, d.month - 1, d.day).getTime();
};

export const MONTHS: IDatePickerItem[] = [
  { value: 1,  label: 'January',   shortName: 'Jan' },
  { value: 2,  label: 'February',  shortName: 'Feb' },
  { value: 3,  label: 'March',     shortName: 'Mar' },
  { value: 4,  label: 'April',     shortName: 'Apr' },
  { value: 5,  label: 'May',       shortName: 'May' },
  { value: 6,  label: 'June',      shortName: 'Jun' },
  { value: 7,  label: 'July',      shortName: 'Jul' },
  { value: 8,  label: 'August',    shortName: 'Aug' },
  { value: 9,  label: 'September', shortName: 'Sep' },
  { value: 10, label: 'October',   shortName: 'Oct' },
  { value: 11, label: 'November',  shortName: 'Nov' },
  { value: 12, label: 'December',  shortName: 'Dec' },
];

export const WEEK_DAYS: IDatePickerItem[] = [
  { value: 0, label: 'Sunday',    shortName: 'Su' },
  { value: 1, label: 'Monday',    shortName: 'Mo' },
  { value: 2, label: 'Tuesday',   shortName: 'Tu' },
  { value: 3, label: 'Wednesday', shortName: 'We' },
  { value: 4, label: 'Thursday',  shortName: 'Th' },
  { value: 5, label: 'Friday',    shortName: 'Fr' },
  { value: 6, label: 'Saturday',  shortName: 'Sa' },
];
