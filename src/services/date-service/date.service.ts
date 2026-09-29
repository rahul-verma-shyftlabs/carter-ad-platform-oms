import moment from 'moment-timezone';
import DateTimeParser from '@/lib/date-time-parser';
import { getStore } from '@/redux/store';

export type DataInterval =
  | 'realtime'
  | 'realtimeOccupancy'
  | 'today'
  | 'today_24_hrs'
  | 'last_24_hrs'
  | 'yesterday'
  | 'yesterday_24_hrs'
  | 'last_7_days'
  | '7_days_before_after'
  | 'last_14_days'
  | 'last_30_days'
  | 'last_90_days';

export default class DateService {
  getDateRange(
    timeSlot: DataInterval | undefined,
    timezone: string = getStore()?.getState()?.common?.user?.timeZoneName ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC',
  ) {
    let startDate;
    let endDate;
    switch (timeSlot) {
      case 'realtime':
        startDate = DateTimeParser().tz(timezone).subtract(30, 'minutes');
        endDate = DateTimeParser().tz(timezone);
        break;
      case 'today':
        startDate = DateTimeParser().tz(timezone).set('hour', 7).startOf('hour');
        endDate = DateTimeParser().tz(timezone).set('hour', 19).startOf('hour');
        break;

      case 'today_24_hrs':
        startDate = DateTimeParser().tz(timezone).startOf('day');
        endDate = DateTimeParser().tz(timezone).endOf('day');
        break;

      case 'last_24_hrs':
        startDate = DateTimeParser().tz(timezone).startOf('minute').subtract(24, 'hours');
        endDate = DateTimeParser().tz(timezone).startOf('minute');
        break;

      case 'yesterday':
        startDate = DateTimeParser().tz(timezone).set('hour', 7).subtract(1, 'day').startOf('hour');
        endDate = DateTimeParser().tz(timezone).set('hour', 19).subtract(1, 'day').startOf('hour');
        break;

      case 'yesterday_24_hrs':
        startDate = DateTimeParser().tz(timezone).subtract(1, 'day').startOf('day');
        endDate = DateTimeParser().tz(timezone).subtract(1, 'day').endOf('day');
        break;

      case 'last_7_days':
        startDate = DateTimeParser().tz(timezone).subtract(6, 'day').startOf('day');
        endDate = DateTimeParser().tz(timezone).endOf('day');
        break;
      case 'last_14_days':
        startDate = DateTimeParser().tz(timezone).subtract(14, 'day').startOf('day');
        endDate = DateTimeParser().tz(timezone).endOf('day');
        break;
      case '7_days_before_after':
        startDate = DateTimeParser().tz(timezone).subtract(7, 'day').startOf('day');
        endDate = DateTimeParser().tz(timezone).add(7, 'day').endOf('day');
        break;
      case 'last_30_days':
        startDate = DateTimeParser().tz(timezone).subtract(29, 'day').startOf('day');
        endDate = DateTimeParser().tz(timezone).endOf('day');
        break;
      case 'last_90_days':
        startDate = DateTimeParser().tz(timezone).subtract(90, 'day').startOf('day');
        endDate = DateTimeParser().tz(timezone).endOf('day');
        break;
      default:
        startDate = DateTimeParser().tz(timezone).set('hour', 7).startOf('hour');
        endDate = DateTimeParser().tz(timezone).set('hour', 19).startOf('hour');
        break;
    }

    return { startDate, endDate };
  }

  getDateRangeLocal(timeSlot: DataInterval | undefined) {
    let startDate;
    let endDate;
    switch (timeSlot) {
      case 'today':
        startDate = moment().set('hour', 7).startOf('hour');
        endDate = moment().set('hour', 19).startOf('hour');
        break;

      case 'today_24_hrs':
        startDate = moment().startOf('day');
        endDate = moment().endOf('minute');
        break;

      case 'last_24_hrs':
        startDate = moment().startOf('minute');
        endDate = moment().startOf('minute').subtract(24, 'hours');
        break;
      case 'yesterday':
        startDate = moment().set('hour', 7).subtract(1, 'day').startOf('hour');
        endDate = moment().set('hour', 19).subtract(1, 'day').startOf('hour');
        break;

      case 'yesterday_24_hrs':
        startDate = moment().subtract(1, 'day').startOf('day');
        endDate = moment().subtract(1, 'day').endOf('day');
        break;

      case 'last_7_days':
        startDate = moment().utc().subtract(6, 'day').startOf('day');
        endDate = moment().utc().endOf('day');
        break;
      case 'last_14_days':
        startDate = moment().subtract(14, 'day').startOf('day');
        endDate = moment().endOf('day');
        break;
      case 'last_30_days':
        startDate = moment().subtract(29, 'day').startOf('day');
        endDate = moment().endOf('day');
        break;
      case 'last_90_days':
        startDate = moment().subtract(90, 'day').startOf('day');
        endDate = moment().endOf('day');
        break;
      default:
        startDate = moment().set('hour', 7).startOf('hour');
        endDate = moment().set('hour', 19).startOf('hour');
        break;
    }

    return { startDate, endDate };
  }

  extractDDMMYYYY(date: string | undefined | null, divider: string = '-') {
    return typeof date === 'string'
      ? date.split('T')[0].split('-').join(divider)
      : DateTimeParser().format('MM-DD-YYYY');
  }
}
