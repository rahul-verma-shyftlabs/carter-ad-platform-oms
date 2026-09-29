import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface DateCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const DateCell: React.FC<DateCellProps> = ({ value, itemId, columnId, boardId, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const mondayService = useMemo(() => new MondayService(), []);
  const cellRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Parse date value - handle different structures from Monday.com API
  // The value can be:
  // 1. Direct object with date property (from GraphQL DateValue fragment)
  // 2. Object with value as JSON string that needs parsing
  // 3. Object with text property containing date string
  let dateString: string | null = null;
  
  if (value) {
    // Case 1: Direct date property
    if (value.date) {
      dateString = value.date;
    }
    // Case 2: Value is a JSON string that needs parsing
    else if (value.value && typeof value.value === 'string') {
      try {
        const parsed = JSON.parse(value.value);
        if (parsed.date) {
          dateString = parsed.date;
        } else if (typeof parsed === 'string') {
          dateString = parsed;
        }
      } catch {
        // If parsing fails, try to use value as-is if it looks like a date
        if (value.value.match(/^\d{4}-\d{2}-\d{2}/)) {
          dateString = value.value;
        }
      }
    }
    // Case 3: Text property might contain date
    else if (value.text && typeof value.text === 'string') {
      if (value.text.match(/^\d{4}-\d{2}-\d{2}/) || value.text.includes('-')) {
        dateString = value.text;
      }
    }
  }

  // Parse date string in local timezone to avoid timezone conversion issues
  // Date strings like "2024-02-01" should be treated as local dates, not UTC
  const currentDate = useMemo(() => {
    if (!dateString) return null;
    
    // Parse YYYY-MM-DD format and create date in local timezone
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // month is 0-indexed
      const day = parseInt(dateMatch[3], 10);
      return new Date(year, month, day);
    }
    
    // Fallback to standard Date parsing for other formats
    return new Date(dateString);
  }, [dateString]);

  const displayDate = currentDate && !isNaN(currentDate.getTime())
    ? currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  // Initialize edit value when opening - format as YYYY-MM-DD
  // If field is blank, show today's date instead
  useEffect(() => {
    if (isOpen) {
      if (currentDate && !isNaN(currentDate.getTime())) {
        // Use existing date
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        setEditDateValue(`${year}-${month}-${day}`);
      } else {
        // Field is blank - show today's date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setEditDateValue(`${year}-${month}-${day}`);
      }
    }
  }, [isOpen, currentDate]);

  const handleDateSave = async (dateValue?: string) => {
    const dateToSave = dateValue !== undefined ? dateValue : editDateValue;
    
    setIsOpen(false);
    setIsUpdating(true);
    
    try {
      if (!columnId) {
        throw new Error('Column ID is missing');
      }
      if (!itemId) {
        throw new Error('Item ID is missing');
      }
      if (!boardId) {
        throw new Error('Board ID is missing');
      }
      
      // Allow clearing date - if dateToSave is empty, send empty string
      const finalDateToSave = dateToSave || '';
      
      await mondayService.updateColumnValue(boardId, itemId, columnId, { date: finalDateToSave });
      
      // Clear skeleton after successful update
      setIsUpdating(false);
      
      // Refresh data silently (getBoard will use silent mode)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Update date failed';
      showAlert({
        variant: 'error' as any,
        title: errorMessage,
      });
    }
  };

  // Position calendar dropdown below the cell
  useEffect(() => {
    if (isOpen && cellRef.current && calendarRef.current) {
      const cellRect = cellRef.current.getBoundingClientRect();
      const calendar = calendarRef.current;
      
      // Position calendar below the cell
      calendar.style.top = `${cellRect.bottom + 4}px`;
      calendar.style.left = `${cellRect.left}px`;
      
      // Adjust if calendar would go off screen
      const calendarRect = calendar.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // If calendar goes below viewport, show above instead
      if (calendarRect.bottom > viewportHeight) {
        calendar.style.top = `${cellRect.top - calendarRect.height - 4}px`;
      }
      
      // If calendar goes off right edge, align to right
      if (calendarRect.right > viewportWidth) {
        calendar.style.left = `${viewportWidth - calendarRect.width - 8}px`;
      }
      
      // If calendar goes off left edge, align to left
      if (calendarRect.left < 0) {
        calendar.style.left = '8px';
      }
    }
  }, [isOpen]);

  // Close on outside click or when clicking on another dropdown
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Don't close if clicking on native date picker elements
        // Native date picker creates elements outside our DOM tree
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'date') {
          // This is the date input itself, don't close
          return;
        }
        
        // Close if clicking outside this dropdown (including on other dropdown triggers)
        const isThisDropdown = target.closest('[data-date-calendar]') || target.closest('[data-date-trigger]');
        
        if (!isThisDropdown) {
          // Small delay to allow native date picker to process clicks
          setTimeout(() => {
            setIsOpen(false);
          }, 200);
        }
      };
      
      // Listen for global close event (when another dropdown opens)
      const handleCloseAll = () => {
        setIsOpen(false);
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('closeAllDropdowns', handleCloseAll);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('closeAllDropdowns', handleCloseAll);
      };
    }
  }, [isOpen]);

  return (
    <>
      {isUpdating ? (
        <div
          className={styles.monday_cell}
          style={{
            padding: '6px 8px',
            minWidth: '120px',
          }}
        >
          <Skeleton variant="rectangular" width="100%" height="16px" style={{ borderRadius: '2px' }} />
        </div>
      ) : (
        <div
          ref={cellRef}
          data-date-trigger
          className={styles.monday_cell}
          style={{
            padding: '6px 8px',
            minWidth: '120px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              // If already open, just close it
              setIsOpen(false);
            } else {
              // If closed, close all other dropdowns first, then open this one
              window.dispatchEvent(new CustomEvent('closeAllDropdowns'));
              // Use setTimeout to ensure other dropdowns close first
              setTimeout(() => {
                setIsOpen(true);
              }, 0);
            }
          }}
        >
          {displayDate ? (
            <>
              <CalendarIcon size={12} color={carterColors['text-400']} />
              <div style={{ fontSize: '12px' }}>
                <Typography variant="body-regular" color={carterColors['text-900']}>
                  {displayDate}
                </Typography>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px' }}>
              <Typography variant="body-regular" color={carterColors['text-400']}>
                Set date
              </Typography>
            </div>
          )}
        </div>
      )}

      {/* Sheet-style Calendar Dropdown */}
      {isOpen && (
        <div
          ref={calendarRef}
          data-date-calendar
          style={{
            position: 'fixed',
            zIndex: 2000,
            backgroundColor: 'white',
            border: `1px solid ${carterColors['grey-300']}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            padding: '12px',
            minWidth: '240px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="date"
            value={editDateValue}
            onChange={(e) => {
              // Update local state
              const newValue = e.target.value;
              setEditDateValue(newValue);
              // Save immediately when a date is selected
              if (newValue) {
                handleDateSave(newValue);
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleDateSave();
              }
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${carterColors['grey-300']}`,
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      )}
    </>
  );
};

export default DateCell;
