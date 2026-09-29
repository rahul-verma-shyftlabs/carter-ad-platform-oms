import React from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import styles from '../../../styles/crm.module.scss';

interface TimelineCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const TimelineCell: React.FC<TimelineCellProps> = ({ value }) => {
  // Parse value - it might be a column value object with a JSON string in value.value
  let parsedValue: any = value;
  if (value?.value && typeof value.value === 'string') {
    try {
      parsedValue = JSON.parse(value.value);
    } catch {
      // If parsing fails, use the value object directly
      parsedValue = value;
    }
  }
  
  const startDate = parsedValue?.from ? new Date(parsedValue.from) : null;
  const endDate = parsedValue?.to ? new Date(parsedValue.to) : null;

  if (!startDate || !endDate) {
    return (
      <div
        className={styles.monday_cell}
        style={{
          padding: '6px 8px',
          minWidth: '120px',
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '100%',
            height: '20px',
            backgroundColor: carterColors['grey-200'],
            borderRadius: '4px',
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const displayText = `${startStr} - ${endStr}`;
  
  // Determine if timeline is in the past or future
  const now = new Date();
  const isPast = endDate < now;
  const isActive = startDate <= now && endDate >= now;
  
  // Choose color based on timeline state
  let barColor = '#579bfc'; // Blue for active/future
  if (isPast) {
    barColor = '#2e2e2e'; // Black/grey for past
  } else if (isActive) {
    barColor = '#579bfc'; // Blue for active
  }

  return (
    <div
      className={styles.monday_cell}
      style={{
        padding: '6px 8px',
        minWidth: '120px',
        display: 'flex',
        alignItems: 'center',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: '100%',
          height: '20px',
          backgroundColor: barColor,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ 
          fontSize: '10px', 
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          zIndex: 1,
        }}>
          <Typography variant="body-regular" color="white">
            {displayText}
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default TimelineCell;
