import React from 'react';
import { Button } from 'shyftlabs-dsl';

type TDateRange = { startDate: Date | undefined; endDate: Date | undefined };
type TDateType = Date | TDateRange | null | undefined;

type TDateInput = {
  date?: TDateType;
  handleDateChange: (date: TDateType) => void;
  clearable?: boolean;
  className?: string;
  range?: boolean;
};

const toInputValue = (date?: TDateType): string => {
  if (!date || (typeof date === 'object' && !(date instanceof Date))) return '';
  const asDate = date as Date;
  if (Number.isNaN(asDate.getTime())) return '';
  return asDate.toISOString().slice(0, 10);
};

const DateInput: React.FC<TDateInput> = ({ date, handleDateChange, clearable, className }) => {
  return (
    <div className={className} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="date"
        value={toInputValue(date)}
        onChange={event => {
          handleDateChange(event.target.value ? new Date(event.target.value) : null);
        }}
      />
      {clearable && date ? (
        <Button
          variant="secondary"
          size="small"
          label="Clear"
          onClick={() => handleDateChange(null)}
        />
      ) : null}
    </div>
  );
};

export default DateInput;
