import { DateTimeType } from '@/lib/date-time-parser';

type TIsDateRangeAllowedOptions = {
  startDate?: DateTimeType | null;
  endDate?: DateTimeType | null;
  maxAllowedRange?: number;
};

export const isDateRangeAllowed = (options: TIsDateRangeAllowedOptions): boolean => {
  const { startDate, endDate, maxAllowedRange = 365 } = options;
  if (!startDate || !endDate) {
    return true;
  }
  return endDate.diff(startDate, 'days') <= maxAllowedRange;
};

export const getAppBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_BASE_URL || '';
};
