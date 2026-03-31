export type DatePickerGridModeType      = 'YEAR' | 'MONTH' | 'DAY';
export type DatePickerSelectionModeType = 'range' | 'single';
export type DatePickerDisplayType       = 'current' | 'previous' | 'next';

export const DATE_SEPARATOR_REGEX = /[-/.]/;
export const DATE_FORMAT_REGEX    = /^(\d{4}|\d{2}|\d{1,2})[-./ ](\d{1,2})[-./ ](\d{4}|\d{2}|\d{1,2})$/;
