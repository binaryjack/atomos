import type { DatePickerGridModeType } from './types/date-picker.types.js';
import { createDateObject } from './models.js';
import type { IDateObject } from './models.js';

export const getNextDate = function(
  mode:    DatePickerGridModeType,
  current: IDateObject,
): IDateObject {
  switch (mode) {
    case 'DAY': {
      const d = new Date(current.year, current.month - 1 + 1, 1);
      return createDateObject(current.day, d.getMonth() + 1, d.getFullYear());
    }
    case 'MONTH': {
      return createDateObject(current.day, current.month, current.year + 1);
    }
    case 'YEAR': {
      return createDateObject(current.day, current.month, current.year + 12);
    }
  }
};

export const getPreviousDate = function(
  mode:    DatePickerGridModeType,
  current: IDateObject,
): IDateObject {
  switch (mode) {
    case 'DAY': {
      const d = new Date(current.year, current.month - 1 - 1, 1);
      return createDateObject(current.day, d.getMonth() + 1, d.getFullYear());
    }
    case 'MONTH': {
      return createDateObject(current.day, current.month, current.year - 1);
    }
    case 'YEAR': {
      return createDateObject(current.day, current.month, current.year - 12);
    }
  }
};
