import React from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import styles from '../../../styles/crm.module.scss';

interface SubtasksCellProps {
  value: any;
}

const SubtasksCell: React.FC<SubtasksCellProps> = ({ value }) => {

  // Parse the value - it might be a string "{}" or an object
  let subtaskCount = 0;
  let subtasks: any[] = [];

  if (value) {
    // Handle different value formats
    if (typeof value === 'string' && value.trim() !== '') {
      // If value is a string, try to parse it
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.subitems)) {
            subtasks = parsed.subitems;
            subtaskCount = subtasks.length;
          } else if (Object.keys(parsed).length === 0 || parsed === '{}') {
            subtaskCount = 0;
          }
        }
      } catch {
        // If parsing fails, treat as empty
        subtaskCount = 0;
      }
    } else if (value.value) {
      // Handle value.value format (from column_values)
      if (typeof value.value === 'string') {
        try {
          const parsed = JSON.parse(value.value);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.subitems)) {
              subtasks = parsed.subitems;
              subtaskCount = subtasks.length;
            } else if (Object.keys(parsed).length === 0 || value.value === '{}') {
              subtaskCount = 0;
            }
          }
        } catch {
          // If parsing fails or is "{}", treat as empty
          if (value.value === '{}' || value.value.trim() === '{}') {
            subtaskCount = 0;
          }
        }
      }
    } else if (value.subitems && Array.isArray(value.subitems)) {
      subtasks = value.subitems;
      subtaskCount = subtasks.length;
    } else if (typeof value === 'object' && value !== null) {
      // Try to get count from various possible structures
      subtaskCount = value.count || (Array.isArray(value) ? value.length : 0);
    }
  }

  // If value is explicitly "{}" or empty, show 0
  if (value?.value === '{}' || (typeof value === 'string' && value === '{}')) {
    subtaskCount = 0;
  }

  return (
    <div
      className={styles.monday_cell}
      style={{
        padding: '6px 8px',
        minWidth: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={(e) => {
        e.stopPropagation();
        // TODO: Open subtasks management dialog or expand subitems
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = carterColors['grey-100'];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {subtaskCount > 0 ? (
          <div
            style={{
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              backgroundColor: carterColors['brand-100'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
              fontSize: '11px',
              color: carterColors['brand-700'],
              fontWeight: 600,
            }}
          >
            {subtaskCount}
          </div>
        ) : (
          <div style={{ fontSize: '12px' }}>
            <Typography variant="body-regular" color={carterColors['text-400']}>
              0
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtasksCell;
