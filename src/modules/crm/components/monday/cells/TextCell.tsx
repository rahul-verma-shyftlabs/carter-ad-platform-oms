import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { Skeleton, Tooltip } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface TextCellProps {
  value: string;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const TextCell: React.FC<TextCellProps> = ({ value, itemId, columnId, boardId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mondayService = useMemo(() => new MondayService(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  
  const displayValue = value || '-';
  
  // Update input value when editing starts or value prop changes
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.value = value;
    }
  }, [isEditing, value]);

  // Check if text is truncated
  useEffect(() => {
    if (textRef.current && displayValue !== '-') {
      const element = textRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [displayValue]);

  const handleSave = useCallback(async () => {
    const finalValue = inputRef.current?.value || value;
    setIsEditing(false);
    setIsUpdating(true);
    
    try {
      await mondayService.updateColumnValue(boardId, itemId, columnId, { text: finalValue });
      
      // Clear skeleton after successful update
      setIsUpdating(false);
      
      // Refresh data silently (getBoard will use silent mode)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      if (inputRef.current) {
        inputRef.current.value = value;
      }
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Update value failed',
      });
    }
  }, [boardId, itemId, columnId, mondayService, onUpdate, value]);

  if (isEditing) {
    return (
      <div
        className={styles.monday_cell}
        style={{ padding: '4px 8px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
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
      <Tooltip title={isTruncated ? displayValue : ''} arrow>
        <div
          ref={textRef}
          style={{
            fontSize: '12px',
            lineHeight: '16px',
            maxHeight: '32px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="body-regular" trimLength={300}  color={carterColors['text-900']}>
            {displayValue}
          </Typography>
        </div>
      </Tooltip>
    </div>
  );
};

export default TextCell;
