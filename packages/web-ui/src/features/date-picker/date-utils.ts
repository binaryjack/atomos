export enum DateFormatsEnum {
  DD_MM_YYYY = 'DD/MM/YYYY',
  MM_DD_YYYY = 'MM/DD/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
  DD_MM_YY   = 'DD/MM/YY',
  MM_DD_YY   = 'MM/DD/YY',
}

export const formatDate = function(
  date: Date,
  format: DateFormatsEnum = DateFormatsEnum.DD_MM_YYYY,
  separator?: string,
): string {
  const d  = String(date.getDate()).padStart(2, '0');
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const y4 = String(date.getFullYear());
  const s  = separator ?? (format === DateFormatsEnum.YYYY_MM_DD ? '-' : '/');

  switch (format) {
    case DateFormatsEnum.DD_MM_YYYY: return `${d}${s}${m}${s}${y4}`;
    case DateFormatsEnum.MM_DD_YYYY: return `${m}${s}${d}${s}${y4}`;
    case DateFormatsEnum.YYYY_MM_DD: return `${y4}${s}${m}${s}${d}`;
    case DateFormatsEnum.DD_MM_YY:   return `${d}${s}${m}${s}${yy}`;
    case DateFormatsEnum.MM_DD_YY:   return `${m}${s}${d}${s}${yy}`;
    default:                         return `${d}${s}${m}${s}${y4}`;
  }
};

export const parseDate = function(
  value: string,
  format: DateFormatsEnum = DateFormatsEnum.DD_MM_YYYY,
): Date | null {
  const parts = value.split(/[-/.]/);
  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;

  switch (format) {
    case DateFormatsEnum.DD_MM_YYYY:
    case DateFormatsEnum.DD_MM_YY:
      day   = parseInt(parts[0] ?? '0', 10);
      month = parseInt(parts[1] ?? '0', 10) - 1;
      year  = parseInt(parts[2] ?? '0', 10);
      break;
    case DateFormatsEnum.MM_DD_YYYY:
    case DateFormatsEnum.MM_DD_YY:
      month = parseInt(parts[0] ?? '0', 10) - 1;
      day   = parseInt(parts[1] ?? '0', 10);
      year  = parseInt(parts[2] ?? '0', 10);
      break;
    case DateFormatsEnum.YYYY_MM_DD:
      year  = parseInt(parts[0] ?? '0', 10);
      month = parseInt(parts[1] ?? '0', 10) - 1;
      day   = parseInt(parts[2] ?? '0', 10);
      break;
    default: return null;
  }

  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
};
