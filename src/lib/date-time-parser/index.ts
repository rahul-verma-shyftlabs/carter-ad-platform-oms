import moment, { Moment as DateTimeType } from 'moment-timezone';

const userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const setUserTimezone = (timezone: string): void => {
  moment.tz.setDefault(timezone || userTimezone);
};

const DateTimeParser = moment;

export type { DateTimeType };

export default DateTimeParser;
