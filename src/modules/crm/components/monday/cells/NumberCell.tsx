import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { Skeleton, Tooltip } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface NumberCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const NumberCell: React.FC<NumberCellProps> = ({ value, itemId, columnId, boardId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mondayService = useMemo(() => new MondayService(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  
  const displayValue = value?.text || value?.value || '';
  
  const formattedValue = displayValue && !isNaN(parseFloat(displayValue))
    ? parseFloat(displayValue).toLocaleString()
    : displayValue || '-';
  
  // Update input value when editing starts or value prop changes
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.value = displayValue;
    }
  }, [isEditing, displayValue]);

  // Check if text is truncated
  useEffect(() => {
    if (textRef.current && formattedValue !== '-') {
      const element = textRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [formattedValue]);

  const handleSave = useCallback(async () => {
    const inputValue = inputRef.current?.value || displayValue;
    const numValue = parseFloat(inputValue) || 0;
    setIsEditing(false);
    setIsUpdating(true);
    
    try {
      await mondayService.updateColumnValue(boardId, itemId, columnId, { number: numValue });
      
      // Clear skeleton after successful update
      setIsUpdating(false);
      
      // Refresh data silently (getBoard will use silent mode)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      if (inputRef.current) {
        inputRef.current.value = displayValue;
      }
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Update value failed',
      });
    }
  }, [boardId, itemId, columnId, displayValue, mondayService, onUpdate]);

  if (isEditing) {
    return (
      <div
        className={styles.monday_cell}
        style={{ padding: '4px 8px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="number"
          defaultValue={displayValue}
          onBlur={handleSave}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            }
          }}
          autoFocus
          style={{
            width: '100%',
            border: `1px solid ${carterColors['brand-600']}`,
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>
    );
  }

  if (isUpdating) {
    return (
      <div
        className={styles.monday_cell}
        style={{
          padding: '6px 8px',
          minWidth: '120px',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="16px" style={{ borderRadius: '2px' }} />
      </div>
    );
  }

  return (
    <div
      className={styles.monday_cell}
      style={{
        padding: '6px 8px',
        minWidth: '120px',
        cursor: 'text',
      }}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <Tooltip title={isTruncated ? formattedValue : ''} arrow>
        <div
          ref={textRef}
          style={{
            fontSize: '12px',
            textAlign: 'right',
            lineHeight: '16px',
            maxHeight: '32px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="body-regular" color={carterColors['text-900']}>
            {formattedValue}
          </Typography>
        </div>
      </Tooltip>
    </div>
  );
};

export default NumberCell;
