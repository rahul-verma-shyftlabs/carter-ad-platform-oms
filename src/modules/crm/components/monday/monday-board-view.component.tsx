import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Typography,
  carterColors,
} from 'shyftlabs-dsl';
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  X,
  AlertCircle,
  ChevronDown,
  SortAsc,
  EyeOff,
  Grid3x3,
  Settings,
  ChevronRight,
  Trash2,
  Edit2,
  Copy,
  SortDesc,
  Upload,
  Archive,
  ArrowRight,
  Maximize,
} from 'lucide-react';
import { Skeleton, Tooltip } from '@/lib/material-ui';
import MondayService, { MondayItem, MondayGroup, MondayColumn } from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import { useMondayBoard, useMondayItem } from '../../hooks';
import styles from '../../styles/crm.module.scss';
import StatusCell from './cells/StatusCell';
import DateCell from './cells/DateCell';
import PersonCell from './cells/PersonCell';
import TextCell from './cells/TextCell';
import NumberCell from './cells/NumberCell';
import FileCell from './cells/FileCell';
import TimelineCell from './cells/TimelineCell';
import CheckboxCell from './cells/CheckboxCell';
import TagsCell from './cells/TagsCell';
import PriorityCell from './cells/PriorityCell';

interface MondayBoardViewProps {
  boardId: string;
  /** When true, hides the top header (back button, board name). Used when embedded e.g. in Ad Ops Overview Sheet. */
  hideHeader?: boolean;
}

interface ColumnWidth {
  [columnId: string]: number;
}

interface ColumnVisibility {
  [columnId: string]: boolean;
}

// Default group title color when not found from Monday
const DEFAULT_GROUP_COLOR = '#000000';

// Utility function to get status color from status value (similar to StatusCell logic)
const getStatusColorFromValue = (statusValue: any, column: MondayColumn): string => {
  if (!statusValue) return DEFAULT_GROUP_COLOR;
  
  // Try to get color from status value directly
  let statusLabel: string | null = null;
  let statusIndex: number | null = null;
  
  // Parse status value
  if (statusValue.label !== undefined && statusValue.label !== null) {
    statusLabel = statusValue.label;
    statusIndex = statusValue.index !== undefined && statusValue.index !== null ? statusValue.index : null;
  } else if (statusValue.value && typeof statusValue.value === 'string') {
    try {
      const parsed = JSON.parse(statusValue.value);
      if (parsed.label) {
        statusLabel = parsed.label;
        statusIndex = parsed.index !== undefined && parsed.index !== null ? parsed.index : null;
      }
    } catch {
      statusLabel = statusValue.text || null;
    }
  } else if (statusValue.text) {
    statusLabel = statusValue.text;
  }
  
  if (!statusLabel) return DEFAULT_GROUP_COLOR;
  
  // Try to get color from column settings
  if (column.settings_str) {
    try {
      const settings = JSON.parse(column.settings_str);
      const labelsColors = settings.labels_colors || {};
      
      // Try by index first
      if (statusIndex !== null && labelsColors[String(statusIndex)]) {
        const colorInfo = labelsColors[String(statusIndex)];
        if (colorInfo && colorInfo.color) {
          return colorInfo.color;
        }
      }
      
      // Try by label
      for (const [, colorInfo] of Object.entries(labelsColors)) {
        if (colorInfo && typeof colorInfo === 'object' && colorInfo !== null) {
          const info = colorInfo as any;
          if (info.label && typeof info.label === 'string' && info.color && typeof info.color === 'string') {
            if (info.label.trim().toLowerCase() === statusLabel.trim().toLowerCase()) {
              return info.color;
            }
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  // Fallback to label-based colors
  const labelLower = statusLabel.toLowerCase().trim();
  if (labelLower === 'done' || labelLower.includes('done')) {
    return '#00c875';
  } else if (labelLower === 'stuck' || labelLower.includes('stuck')) {
    return '#e2445c';
  } else if (labelLower.includes('working')) {
    return '#fdab3d';
  } else if (labelLower === 'not started' || labelLower.includes('not started')) {
    return '#c4c4c4';
  }
  
  return DEFAULT_GROUP_COLOR;
};


// Utility function to format relative time (e.g., "2 seconds ago", "5 minutes ago")
const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Try parsing as JSON first (Monday.com often stores dates as JSON strings)
      let dateString = date;
      try {
        const parsed = JSON.parse(date);
        // If parsed successfully, check for common date fields
        if (parsed.date) {
          dateString = parsed.date;
        } else if (parsed.updated_at) {
          dateString = parsed.updated_at;
        } else if (typeof parsed === 'string') {
          dateString = parsed;
        }
      } catch {
        // Not JSON, use as-is
      }
      
      dateObj = new Date(dateString);
    } else {
      return '-';
    }
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    
    // Handle future dates (shouldn't happen, but just in case)
    if (diffInMs < 0) {
      return 'just now';
    }
    
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
    } else if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
    }
    } catch {
      return '-';
    }
};

// Helper component for truncated text with tooltip
const TruncatedText: React.FC<{
  text: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ text, style, children }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [text]);

  const content = children || text;

  return (
    <Tooltip title={isTruncated ? text : ''} arrow>
      <span ref={textRef} style={style}>
        {content}
      </span>
    </Tooltip>
  );
};

// Sortable Row Component Interface
interface SortableRowProps {
  item: MondayItem;
  groupId: string;
  isSelected: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onOpenDrawer?: () => void;
  expandedItems: Set<string>;
  toggleItemExpanded: (itemId: string) => void;
  handleItemClick: (itemId: string, e?: React.MouseEvent) => void;
  checkboxColumnWidth: number;
  handleCheckboxChange: (itemId: string, checked: boolean) => void;
  taskColumnWidth: number;
  resizingColumn: string | null;
  TASK_COLUMN_ID: string;
  editingItemName: string | null;
  itemNameInputRef: React.RefObject<HTMLInputElement>;
  setEditingItemName: (itemId: string | null) => void;
  mondayService: MondayService;
  boardId: string;
  mutateBoard: () => void;
  visibleColumns: MondayColumn[];
  columns: MondayColumn[];
  columnWidths: ColumnWidth;
  focusedCell: { itemId: string; columnId: string } | null;
  setFocusedCell: (cell: { itemId: string; columnId: string } | null) => void;
  renderCell: (item: MondayItem, column: MondayColumn) => React.ReactNode;
  editingSubitemName: string | null;
  subitemNameInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
  setEditingSubitemName: (subitemId: string | null) => void;
  creatingSubitemFor: string | null;
  newSubitemName: string;
  setCreatingSubitemFor: (itemId: string | null) => void;
  setNewSubitemName: (name: string) => void;
}

// Sortable Row Component
const SortableRow: React.FC<SortableRowProps> = ({
  item,
  isSelected,
  onOpenDrawer,
  expandedItems,
  toggleItemExpanded,
  handleItemClick,
  checkboxColumnWidth,
  handleCheckboxChange,
  taskColumnWidth,
  resizingColumn,
  TASK_COLUMN_ID,
  editingItemName,
  itemNameInputRef,
  setEditingItemName,
  mondayService,
  boardId,
  mutateBoard,
  visibleColumns,
  columns,
  columnWidths,
  focusedCell,
  setFocusedCell,
  renderCell,
  editingSubitemName,
  subitemNameInputRefs,
  setEditingSubitemName,
  creatingSubitemFor,
  newSubitemName,
  setCreatingSubitemFor,
  setNewSubitemName,
}) => {
  const isExpanded = expandedItems.has(item.id);

  return (
    <>
      <tr
        className={`${styles.monday_row} ${isSelected ? styles.selected : ''}`}
        style={{
          cursor: 'pointer',
          borderBottom: `1px solid ${carterColors['grey-100']}`,
          backgroundColor: isSelected ? carterColors['brand-100'] : 'white',
          borderLeft: isSelected ? `3px solid ${carterColors['brand-600']}` : '3px solid transparent',
        }}
        onClick={(e) => handleItemClick(item.id, e)}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {/* Checkbox Column */}
        <td
          style={{
            width: `${checkboxColumnWidth}px`,
            minWidth: `${checkboxColumnWidth}px`,
            padding: '8px 6px',
            borderRight: `1px solid ${carterColors['grey-200']}`,
            textAlign: 'center',
            verticalAlign: 'middle',
            transition: 'background-color 0.15s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </td>
        {/* Task Name Column */}
        <td
          style={{
            width: `${taskColumnWidth}px`,
            borderRight: `1px solid ${carterColors['grey-200']}`,
            verticalAlign: 'middle',
            transition: resizingColumn === TASK_COLUMN_ID ? 'none' : undefined,
            cursor: 'pointer',
          }}
          onClick={(e) => {
            // Toggle accordion on cell click
            e.stopPropagation();
            toggleItemExpanded(item.id);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Chevron for subitems - always visible */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                marginRight: '4px',
                flexShrink: 0,
              }}
            >
              {isExpanded ? (
                <ChevronDown size={14} color={carterColors['text-600']} />
              ) : (
                <ChevronRight size={14} color={carterColors['text-600']} />
              )}
            </div>
            <div 
              style={{ flex: 1, fontSize: '12px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
              onClick={(e) => {
                e.stopPropagation();
                setEditingItemName(item.id);
              }}
            >
              {editingItemName === item.id ? (
                <input
                  ref={itemNameInputRef}
                  type="text"
                  defaultValue={item.name || ''}
                  onBlur={async () => {
                    const newValue = itemNameInputRef.current?.value.trim() || '';
                    if (newValue && newValue !== item.name) {
                      try {
                        // Use updateItem which uses change_multiple_column_values for name updates
                        // change_column_value doesn't support the name column
                        await mondayService.updateItem(item.id, newValue, boardId);
                        mutateBoard();
                      } catch (error: any) {
                        showAlert({
                          variant: 'error' as any,
                          title: error?.message || 'Update item name failed',
                        });
                        // Reset to original name on error
                        if (itemNameInputRef.current) {
                          itemNameInputRef.current.value = item.name || '';
                        }
                      }
                    }
                    setEditingItemName(null);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      if (itemNameInputRef.current) {
                        itemNameInputRef.current.value = item.name || '';
                      }
                      setEditingItemName(null);
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
                    backgroundColor: 'white',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Typography
                  variant="body-regular"
                  color={carterColors['text-900']}
                >
                  {item.name}
                </Typography>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginLeft: '6px', flexShrink: 0, alignItems: 'center' }}>
              {onOpenDrawer && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDrawer();
                  }}
                  style={{ cursor: 'pointer', padding: '2px', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['grey-200'];
                    e.currentTarget.style.borderRadius = '4px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Open task details"
                >
                  <Maximize size={12} color={carterColors['text-400']} style={{ opacity: 0.6 }} />
                </div>
              )}
            </div>
          </div>
        </td>
        {/* Column Cells */}
        {visibleColumns.map((column: MondayColumn) => {
          const width = columnWidths[column.id] || 150; // Use stored width or default to 150px

          return (
            <td
              key={column.id}
              data-item-id={item.id}
              data-column-id={column.id}
              style={{
                width: `${width}px`,
                minWidth: `${width}px`,
                maxWidth: `${width}px`,
                borderRight: `1px solid ${carterColors['grey-200']}`,
                outline: focusedCell?.itemId === item.id && focusedCell?.columnId === column.id
                  ? `2px solid ${carterColors['brand-600']}`
                  : 'none',
                outlineOffset: '-2px',
                verticalAlign: 'middle',
                transition: resizingColumn === column.id ? 'none' : 'background-color 0.15s ease, outline 0.15s ease',
              }}
              onClick={() => setFocusedCell({ itemId: item.id, columnId: column.id })}
            >
              {renderCell(item, column)}
            </td>
          );
        })}
        {/* Add Column placeholder */}
        <td style={{ minWidth: '120px', padding: '14px' }} />
      </tr>
      {/* Subitems */}
      {isExpanded && (
        <tr>
          {/* Checkbox Column - Empty */}
          <td style={{ 
            width: `${checkboxColumnWidth}px`,
            minWidth: `${checkboxColumnWidth}px`,
            padding: '0',
            borderRight: `1px solid ${carterColors['grey-200']}`
          }} />
          {/* Task Column + Remaining Columns - Contains Subitems nested table, aligned to right */}
          <td 
            colSpan={1 + visibleColumns.length + 1}
            style={{ 
              padding: '0', 
              backgroundColor: 'white',
              borderRight: `1px solid ${carterColors['grey-200']}`,
              verticalAlign: 'top'
            }}
          >
            <div style={{ 
              paddingLeft: '40px', 
              borderTop: `1px solid ${carterColors['grey-200']}`,
              backgroundColor: 'white',
              position: 'relative',
              minHeight: '40px'
            }}>
              {/* Vertical line connecting to parent */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: carterColors['grey-300']
              }} />
              
              {/* Subitems Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '650px' }}>
                <thead>
                  <tr style={{ backgroundColor: carterColors['grey-100'], borderBottom: `1px solid ${carterColors['grey-200']}` }}>
                    <th style={{ 
                      width: '40px', 
                      padding: '8px 6px', 
                      textAlign: 'center',
                      borderRight: `1px solid ${carterColors['grey-200']}`
                    }}>
                      {/* Checkbox column header */}
                    </th>
                    <th style={{ 
                      width: '200px',
                      minWidth: '200px',
                      padding: '8px 12px', 
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: carterColors['text-600'],
                      borderRight: `1px solid ${carterColors['grey-200']}`
                    }}>
                      Subitem
                    </th>
                    <th style={{ 
                      width: '150px',
                      minWidth: '150px',
                      padding: '8px 12px', 
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: carterColors['text-600'],
                      borderRight: `1px solid ${carterColors['grey-200']}`
                    }}>
                      Owner
                    </th>
                    <th style={{ 
                      width: '150px',
                      minWidth: '150px',
                      padding: '8px 12px', 
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: carterColors['text-600'],
                      borderRight: `1px solid ${carterColors['grey-200']}`
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      width: '150px',
                      minWidth: '150px',
                      padding: '8px 12px', 
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: carterColors['text-600'],
                      borderRight: `1px solid ${carterColors['grey-200']}`
                    }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Existing Subitems */}
                  {(() => {
                    const subitems: NonNullable<typeof item.subitems> = item.subitems ?? [];
                    return subitems.length > 0 ? subitems.map((subitem: any) => (
                    <tr 
                      key={subitem.id}
                      style={{ 
                        borderBottom: `1px solid ${carterColors['grey-200']}`,
                        backgroundColor: 'white'
                      }}
                    >
                      <td style={{ 
                        padding: '8px 6px', 
                        textAlign: 'center',
                        borderRight: `1px solid ${carterColors['grey-200']}`
                      }}>
                        <input 
                          type="checkbox" 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ 
                        width: '200px',
                        minWidth: '200px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRight: `1px solid ${carterColors['grey-200']}`
                      }}>
                        <div 
                          style={{ 
                            fontSize: '12px', 
                            minWidth: 0, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap', 
                            cursor: 'text' 
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSubitemName(subitem.id);
                          }}
                        >
                          {editingSubitemName === subitem.id ? (
                            <input
                              ref={(el) => {
                                if (el) {
                                  subitemNameInputRefs.current[subitem.id] = el;
                                }
                              }}
                              type="text"
                              defaultValue={subitem.name || ''}
                              onBlur={async () => {
                                const inputRef = subitemNameInputRefs.current[subitem.id];
                                const newValue = inputRef?.value.trim() || '';
                                if (newValue && newValue !== subitem.name) {
                                  try {
                                    // Update subitem name using updateItem (subitems are items too)
                                    await mondayService.updateItem(subitem.id, newValue, boardId);
                                    mutateBoard();
                                  } catch (error: any) {
                                    showAlert({
                                      variant: 'error' as any,
                                      title: error?.message || 'Update subitem name failed',
                                    });
                                    // Reset to original name on error
                                    if (inputRef) {
                                      inputRef.value = subitem.name || '';
                                    }
                                  }
                                }
                                setEditingSubitemName(null);
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  const inputRef = subitemNameInputRefs.current[subitem.id];
                                  if (inputRef) {
                                    inputRef.value = subitem.name || '';
                                  }
                                  setEditingSubitemName(null);
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
                                backgroundColor: 'white',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <TruncatedText
                              text={subitem.name || ''}
                              style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              <Typography variant="body-regular" color={carterColors['text-900']}>
                                {subitem.name}
                              </Typography>
                            </TruncatedText>
                          )}
                        </div>
                      </td>
                      {/* Owner Column - Always visible */}
                      <td style={{ 
                        width: '150px',
                        minWidth: '150px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRight: `1px solid ${carterColors['grey-200']}`,
                        backgroundColor: 'white',
                        overflow: 'visible',
                        position: 'relative'
                      }}>
                        {(() => {
                          // For subitems, ALWAYS show Owner column - find from subitem's column_values or board columns
                          const allColumns = columns || [];
                          const subitemColumnValues = subitem.column_values || [];
                          
                          // First, try to find people column from subitem's column_values
                          let peopleValue = subitemColumnValues.find((cv: any) => 
                            cv.type === 'people' || 
                            cv.type === 'person' ||
                            (cv.column && (cv.column.type === 'people' || cv.column.type === 'person'))
                          );
                          
                          let peopleColumn: MondayColumn | undefined;
                          let columnId: string | undefined;
                          
                            if (peopleValue) {
                              // Get column ID from the value
                              // In Monday.com, column_values.id IS the column ID
                              columnId = peopleValue.column?.id || peopleValue.column_id || peopleValue.id;
                              if (columnId) {
                                peopleColumn = allColumns.find(c => c.id === columnId);
                                if (!peopleColumn && peopleValue.column) {
                                  // If column object is available from the value, use it
                                  peopleColumn = {
                                    id: peopleValue.column.id,
                                    title: peopleValue.column.title || '',
                                    type: peopleValue.column.type || 'people',
                                    settings_str: peopleValue.column.settings_str,
                                  } as MondayColumn;
                                  columnId = peopleColumn.id;
                                }
                              }
                            }
                          
                          // If not found in subitem values, find from board columns
                          if (!peopleColumn) {
                            peopleColumn = allColumns.find((col: MondayColumn) => 
                              col.type === 'people' || 
                              col.type === 'person' ||
                              col.title?.toLowerCase().includes('owner') ||
                              col.title?.toLowerCase().includes('assign')
                            );
                            if (peopleColumn) {
                              columnId = peopleColumn.id;
                              // Try to find value for this column
                              peopleValue = subitemColumnValues.find((cv: any) => 
                                cv.id === columnId || 
                                cv.column?.id === columnId ||
                                cv.column_id === columnId
                              );
                            }
                          }
                          
                          // Ensure we have a valid column ID
                          const finalColumnId = columnId || peopleColumn?.id;
                          
                          // Get subitem's board ID (subitems have their own board)
                          const subitemBoardId = subitem.board?.id || boardId;
                          
                          // ALWAYS render PersonCell if we have a valid column ID
                          if (finalColumnId) {
                            return (
                              <PersonCell
                                value={peopleValue || null}
                                itemId={subitem.id}
                                columnId={finalColumnId}
                                boardId={subitemBoardId}
                                onUpdate={mutateBoard}
                              />
                            );
                          }
                          
                          // If no column found, show message
                          return (
                            <div style={{
                              fontSize: '12px',
                              padding: '4px',
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Typography variant="body-regular" color={carterColors['text-400']}>
                                No Owner column
                              </Typography>
                            </div>
                          );
                        })()}
                      </td>
                      {/* Status Column - Always visible */}
                      <td style={{ 
                        width: '150px',
                        minWidth: '150px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRight: `1px solid ${carterColors['grey-200']}`,
                        backgroundColor: 'white',
                        overflow: 'visible',
                        position: 'relative'
                      }}>
                        {(() => {
                          // For subitems, ALWAYS show Status column - find from subitem's column_values or board columns
                          const allColumns = columns || [];
                          const subitemColumnValues = subitem.column_values || [];
                          
                          // First, try to find status column from subitem's column_values
                          let statusValue = subitemColumnValues.find((cv: any) => 
                            cv.type === 'status' || 
                            (cv.column && cv.column.type === 'status')
                          );
                          
                          let statusColumn: MondayColumn | undefined;
                          let columnId: string | undefined;
                          let settings: string | undefined;
                          
                          if (statusValue) {
                            // Get column ID from the value
                            // In Monday.com, column_values.id IS the column ID
                            columnId = statusValue.column?.id || statusValue.column_id || statusValue.id;
                            if (columnId) {
                              statusColumn = allColumns.find(c => c.id === columnId);
                              if (statusColumn) {
                                settings = statusColumn.settings_str || statusValue.column?.settings_str;
                              } else if (statusValue.column) {
                                // If column object is available from the value, use it
                                statusColumn = {
                                  id: statusValue.column.id,
                                  title: statusValue.column.title || '',
                                  type: statusValue.column.type || 'status',
                                  settings_str: statusValue.column.settings_str,
                                } as MondayColumn;
                                columnId = statusColumn.id;
                                settings = statusColumn.settings_str;
                              }
                            }
                          }
                          
                          // If not found in subitem values, find from board columns
                          if (!statusColumn) {
                            const allStatusColumns = allColumns.filter((col: MondayColumn) => col.type === 'status');
                            
                            // Helper to check if status column has task status labels (Done, Working on it, Stuck, Blank)
                            const hasTaskStatusLabels = (col: MondayColumn): boolean => {
                              if (!col.settings_str) return false;
                              try {
                                const parsed = JSON.parse(col.settings_str);
                                const labels = parsed.labels || {};
                                const labelValues = Object.values(labels).map(l => String(l).toLowerCase().trim());
                                
                                // Check if it has ALL or MOST of the task status keywords
                                const taskStatusKeywords = ['done', 'working on it', 'stuck', 'not started', 'blank'];
                                const matchingKeywords = taskStatusKeywords.filter(keyword => 
                                  labelValues.some(label => label.includes(keyword))
                                );
                                // Require at least 2 matching keywords to be considered a task status column
                                return matchingKeywords.length >= 2;
                              } catch {
                                return false;
                              }
                            };
                            
                            // Helper to check if status column has placement/asset type labels (should be excluded)
                            const hasPlacementLabels = (col: MondayColumn): boolean => {
                              if (!col.settings_str) return false;
                              try {
                                const parsed = JSON.parse(col.settings_str);
                                const labels = parsed.labels || {};
                                const labelValues = Object.values(labels).map(l => String(l).toLowerCase().trim());
                                
                                // Check for placement/asset type keywords
                                const placementKeywords = [
                                  'display', 'native', 'standard', 'olv', 'online video',
                                  'meta', 'tiktok', 'pinterest', 'feed', 'stories', 'reels'
                                ];
                                return placementKeywords.some(keyword => 
                                  labelValues.some(label => label.includes(keyword))
                                );
                              } catch {
                                return false;
                              }
                            };
                            
                            // Filter out placement/asset type status columns, then find task status column
                            const taskStatusColumns = allStatusColumns.filter(col => 
                              hasTaskStatusLabels(col) && !hasPlacementLabels(col)
                            );
                            
                            // Prefer status column with task status labels (and not placement labels)
                            statusColumn = taskStatusColumns[0] ||
                                         allStatusColumns.find((col: MondayColumn) => 
                                           !hasPlacementLabels(col) && col.title?.toLowerCase().includes('status')
                                         ) ||
                                         allStatusColumns.find((col: MondayColumn) => !hasPlacementLabels(col)) ||
                                         allStatusColumns[0];
                            
                            if (statusColumn) {
                              columnId = statusColumn.id;
                              settings = statusColumn.settings_str;
                              // Try to find value for this column
                              statusValue = subitemColumnValues.find((cv: any) => 
                                cv.id === columnId || 
                                cv.column?.id === columnId ||
                                cv.column_id === columnId
                              );
                            }
                          }
                          
                          // Ensure we have a valid column ID
                          const finalStatusColumnId = columnId || statusColumn?.id;
                          
                          // Get subitem's board ID (subitems have their own board)
                          const subitemBoardId = subitem.board?.id || boardId;
                          
                          // ALWAYS render StatusCell if we have a valid column ID
                          if (finalStatusColumnId) {
                            // Check if the status column has task status labels, if not, don't pass settings
                            // so StatusCell will use default 4 statuses
                            let finalSettings = settings || statusColumn?.settings_str;
                            
                            if (finalSettings) {
                              try {
                                const parsed = JSON.parse(finalSettings);
                                const labels = parsed.labels || {};
                                const labelValues = Object.values(labels).map(l => String(l).toLowerCase().trim());
                                const taskStatusKeywords = ['done', 'working on it', 'stuck', 'not started', 'blank'];
                                const hasTaskStatuses = taskStatusKeywords.some(keyword => 
                                  labelValues.some(label => label.includes(keyword))
                                );
                                
                                // If this column doesn't have task statuses, don't pass settings
                                // StatusCell will use default 4 statuses
                                if (!hasTaskStatuses) {
                                  finalSettings = undefined;
                                }
                              } catch {
                                // If parsing fails, don't pass settings
                                finalSettings = undefined;
                              }
                            }
                            
                            return (
                              <StatusCell
                                value={statusValue || null}
                                itemId={subitem.id}
                                columnId={finalStatusColumnId}
                                boardId={subitemBoardId}
                                settings={finalSettings}
                                onUpdate={mutateBoard}
                              />
                            );
                          }
                          
                          // If no column found, show message
                          return (
                            <div style={{
                              fontSize: '12px',
                              padding: '4px',
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Typography variant="body-regular" color={carterColors['text-400']}>
                                No Status column
                              </Typography>
                            </div>
                          );
                        })()}
                      </td>
                      {/* Date Column - Always visible */}
                      <td style={{ 
                        width: '150px',
                        minWidth: '150px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRight: `1px solid ${carterColors['grey-200']}`,
                        backgroundColor: 'white',
                        overflow: 'visible',
                        position: 'relative'
                      }}>
                        {(() => {
                          // For subitems, ALWAYS show Date column - find from subitem's column_values or board columns
                          const allColumns = columns || [];
                          const subitemColumnValues = subitem.column_values || [];
                          
                          // First, try to find date column from subitem's column_values
                          let dateValue = subitemColumnValues.find((cv: any) => 
                            cv.type === 'date' ||
                            (cv.column && cv.column.type === 'date')
                          );
                          
                          let dateColumn: MondayColumn | undefined;
                          let columnId: string | undefined;
                          
                          if (dateValue) {
                            // Get column ID from the value
                            // In Monday.com, column_values.id IS the column ID
                            columnId = dateValue.column?.id || dateValue.column_id || dateValue.id;
                            if (columnId) {
                              dateColumn = allColumns.find(c => c.id === columnId);
                              if (!dateColumn && dateValue.column) {
                                // If column object is available from the value, use it
                                dateColumn = {
                                  id: dateValue.column.id,
                                  title: dateValue.column.title || '',
                                  type: dateValue.column.type || 'date',
                                  settings_str: dateValue.column.settings_str,
                                } as MondayColumn;
                                columnId = dateColumn.id;
                              }
                            }
                          }
                          
                          // If not found in subitem values, find from board columns
                          if (!dateColumn) {
                            dateColumn = allColumns.find((col: MondayColumn) => 
                              col.type === 'date' || 
                              col.type === 'date-column' ||
                              col.title?.toLowerCase().includes('date') ||
                              col.title?.toLowerCase().includes('due date')
                            );
                            if (dateColumn) {
                              columnId = dateColumn.id;
                              // Try to find value for this column
                              dateValue = subitemColumnValues.find((cv: any) => 
                                cv.id === columnId || 
                                cv.column?.id === columnId ||
                                cv.column_id === columnId
                              );
                            }
                          }
                          
                          // Ensure we have a valid column ID
                          const finalDateColumnId = columnId || dateColumn?.id;
                          
                          // Get subitem's board ID (subitems have their own board)
                          const subitemBoardId = subitem.board?.id || boardId;
                          
                          // ALWAYS render DateCell if we have a valid column ID
                          if (finalDateColumnId) {
                            return (
                              <DateCell
                                value={dateValue || null}
                                itemId={subitem.id}
                                columnId={finalDateColumnId}
                                boardId={subitemBoardId}
                                onUpdate={mutateBoard}
                              />
                            );
                          }
                          
                          // If no column found, show message
                          return (
                            <div style={{
                              fontSize: '12px',
                              padding: '4px',
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Typography variant="body-regular" color={carterColors['text-400']}>
                                No Date column
                              </Typography>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )) : null;
                  })()}
                  
                  {/* Add Subitem Input Row */}
                  <tr style={{ backgroundColor: carterColors['brand-100'] }}>
                    <td style={{ 
                      padding: '8px 6px', 
                      textAlign: 'center',
                      borderRight: `1px solid ${carterColors['grey-200']}`
                    }}>
                      <input 
                        type="checkbox" 
                        disabled
                        style={{ width: '16px', height: '16px', cursor: 'not-allowed', opacity: 0.5 }}
                      />
                    </td>
                    <td colSpan={5} style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        placeholder="+ Add subitem"
                        value={creatingSubitemFor === item.id ? newSubitemName : ''}
                        onFocus={(e) => {
                          e.stopPropagation();
                          // Only set creatingSubitemFor when user focuses on input
                          if (creatingSubitemFor !== item.id) {
                            setCreatingSubitemFor(item.id);
                            setNewSubitemName('');
                          }
                        }}
                        onChange={(e) => {
                          e.stopPropagation();
                          // ONLY update local state - NO API CALLS, NO SAVES
                          const value = e.target.value;
                          setNewSubitemName(value);
                        }}
                        onKeyDown={async (e) => {
                          e.stopPropagation();
                          
                          // Only save on Enter key press - NO OTHER KEYS TRIGGER SAVES
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            
                            // Read value directly from input element
                            const inputElement = e.target as HTMLInputElement;
                            const nameToSave = inputElement.value.trim();
                            
                            if (nameToSave) {
                              // ONLY make API call when Enter is pressed
                              try {
                                await mondayService.createSubitem(item.id, nameToSave);
                                setNewSubitemName('');
                                setCreatingSubitemFor(null);
                                // Refresh board data to show the new subitem
                                mutateBoard();
                              } catch (error: any) {
                                console.error('Create subitem error:', error);
                                showAlert({
                                  variant: 'error' as any,
                                  title: error?.response?.data?.detail || error?.message || 'Create subitem failed',
                                });
                                // Keep the input value on error so user can retry
                                setNewSubitemName(nameToSave);
                              }
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setNewSubitemName('');
                            setCreatingSubitemFor(null);
                          }
                          // All other keys just update the input value (handled by onChange)
                        }}
                        onBlur={(e) => {
                          e.stopPropagation();
                          // Only clear if empty, NEVER save on blur
                          if (!newSubitemName.trim()) {
                            setCreatingSubitemFor(null);
                            setNewSubitemName('');
                          }
                        }}
                        onKeyPress={(e) => {
                          // Prevent any default form submission behavior
                          e.stopPropagation();
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '12px',
                          color: carterColors['text-900'],
                          padding: '4px 0',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const MondayBoardView: React.FC<MondayBoardViewProps> = ({ boardId, hideHeader = false }): JSX.Element | null => {
  const router = useRouter();
  const mondayService = useMemo(() => new MondayService(), []);
  const TASK_COLUMN_ID = '__task_column__'; // Special ID for the Task column

  // Fetch board data
  const { board, error: boardError, mutate: mutateBoard } = useMondayBoard(boardId);

  // Debug: Log board views when board is loaded
  useEffect(() => {
    if (board) {
      // If views is undefined, it means the API doesn't support it
      if (board.views === undefined) {
        // Views field is undefined - Monday.com API may not support querying views through GraphQL
      }
    }
  }, [board]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<ColumnWidth>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showGroupMenu, setShowGroupMenu] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState<string | null>(null);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<string | null>(null);
  const [showDeleteColumnConfirm, setShowDeleteColumnConfirm] = useState<string | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ columnId: string | null; direction: 'asc' | 'desc' | null }>({ columnId: null, direction: null });
  const [filters, setFilters] = useState<Array<{ columnId: string; type: string; value: any }>>([]);
  const [focusedCell, setFocusedCell] = useState<{ itemId: string; columnId: string } | null>(null);
  const [activeCreatingGroupId, setActiveCreatingGroupId] = useState<string | null>(null);
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  const [bulkMoveTargetGroup, setBulkMoveTargetGroup] = useState<string | null>(null);
  const [showMoveToGroupDialog, setShowMoveToGroupDialog] = useState(false);
  const [moveToGroupSearchQuery, setMoveToGroupSearchQuery] = useState('');
  const [moveToGroupSelectedId, setMoveToGroupSelectedId] = useState<string | null>(null);
  const [moveToGroupIsBulk, setMoveToGroupIsBulk] = useState(false);
  const [groupByColumnId, setGroupByColumnId] = useState<string | null>(null);
  const [showGroupByDialog, setShowGroupByDialog] = useState(false);
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set()); // No columns pinned
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; config: any }>>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showViewsMenu, setShowViewsMenu] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()); // Track which items have subitems expanded
  
  // Toggle expanded state for an item
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  const [editingItemName, setEditingItemName] = useState<string | null>(null); // Track which item name is being edited
  const [creatingSubitemFor, setCreatingSubitemFor] = useState<string | null>(null); // Track which item is creating a subitem
  const [newSubitemName, setNewSubitemName] = useState(''); // Track the new subitem name
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const subitemNameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [editingSubitemName, setEditingSubitemName] = useState<string | null>(null); // Track which subitem name is being edited
  const tableRef = useRef<HTMLDivElement>(null);

  // Load saved views from localStorage on mount
  useEffect(() => {
    const storedViews = localStorage.getItem(`monday-views-${boardId}`);
    if (storedViews) {
      try {
        setSavedViews(JSON.parse(storedViews));
      } catch (e) {
        console.error('Failed to load saved views', e);
      }
    }
  }, [boardId]);

  // Save current view configuration
  const saveCurrentView = () => {
    const viewConfig = {
      filters,
      sortConfig,
      columnVisibility,
      columnOrder,
      columnWidths,
      groupByColumnId,
      pinnedColumns: Array.from(pinnedColumns),
    };
    return viewConfig;
  };

  // Load view configuration
  const loadView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setFilters(view.config.filters || []);
      setSortConfig(view.config.sortConfig || { columnId: null, direction: null });
      setColumnVisibility(view.config.columnVisibility || {});
      setColumnOrder(view.config.columnOrder || []);
      setColumnWidths(view.config.columnWidths || {});
      setGroupByColumnId(view.config.groupByColumnId || null);
      setPinnedColumns(new Set(view.config.pinnedColumns || ['name']));
      setCurrentViewId(viewId);
    }
  };

  // Save view
  const handleSaveView = () => {
    if (!newViewName.trim()) {
      showAlert({
        variant: 'error' as any,
        title: 'Please enter a view name',
      });
      return;
    }

    const viewConfig = saveCurrentView();
    const newView = {
      id: `view-${Date.now()}`,
      name: newViewName.trim(),
      config: viewConfig,
    };

    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem(`monday-views-${boardId}`, JSON.stringify(updatedViews));
    setNewViewName('');
    setShowSaveViewDialog(false);
    setCurrentViewId(newView.id);
  };

  // Delete view
  const handleDeleteView = (viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    localStorage.setItem(`monday-views-${boardId}`, JSON.stringify(updatedViews));
    if (currentViewId === viewId) {
      setCurrentViewId(null);
    }
  };


  // Apply group_by from board settings when board loads
  useEffect(() => {
    if (board?.group_by_column_id !== undefined) {
      setGroupByColumnId(board.group_by_column_id);
    }
  }, [board?.group_by_column_id]);

  // Save group_by to backend when it changes
  const handleGroupByChange = useCallback(async (columnId: string | null) => {
    setGroupByColumnId(columnId);
    try {
      await mondayService.updateBoardSettings(boardId, columnId);
    } catch {
      showAlert({
        variant: 'error' as any,
        title: 'Failed to save group by settings',
      });
    }
  }, [boardId, mondayService]);

  const originalGroups = board?.groups || [];
  const allItems = board?.items || [];
  const columns = board?.columns || [];

  // Helper function to get column value
  const getColumnValue = useCallback((item: MondayItem, columnId: string) => {
    return item.column_values?.find((cv: any) => cv.id === columnId || cv.column?.id === columnId);
  }, []);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...allItems];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: MondayItem) =>
        item.name?.toLowerCase().includes(query) ||
        item.column_values?.some((cv: any) =>
          cv.text?.toLowerCase().includes(query) ||
          cv.value?.toString().toLowerCase().includes(query)
        )
      );
    }

    // Apply column filters
    filters.forEach(filter => {
      items = items.filter((item: MondayItem) => {
        const columnValue = item.column_values?.find((cv: any) => cv.id === filter.columnId || cv.column?.id === filter.columnId);
        if (!columnValue) return false;

        switch (filter.type) {
          case 'status':
            return (columnValue as any).label === filter.value;
          case 'people':
            return columnValue.value?.includes(filter.value);
          case 'text':
            return columnValue.text?.toLowerCase().includes(filter.value.toLowerCase());
          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (sortConfig.columnId && sortConfig.direction) {
      items.sort((a, b) => {
        const aValue = a.column_values?.find((cv: any) => cv.id === sortConfig.columnId || cv.column?.id === sortConfig.columnId);
        const bValue = b.column_values?.find((cv: any) => cv.id === sortConfig.columnId || cv.column?.id === sortConfig.columnId);

        const aText = aValue?.text || aValue?.value || '';
        const bText = bValue?.text || bValue?.value || '';

        const comparison = aText.localeCompare(bText);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return items;
  }, [allItems, searchQuery, filters, sortConfig]);

  // Generate dynamic groups when Group By is active
  const groups = useMemo(() => {
    if (!groupByColumnId) {
      return originalGroups;
    }

    const groupByColumn = columns.find(c => c.id === groupByColumnId);
    if (!groupByColumn) return originalGroups;

    // Get unique values from the column
    const valueGroups = new Map<string, MondayItem[]>();

    filteredItems.forEach((item: MondayItem) => {
      const columnValue = getColumnValue(item, groupByColumnId);
      let groupKey = 'No value';

      if (columnValue) {
        switch (groupByColumn.type) {
          case 'status':
            groupKey = (columnValue as any).label || columnValue.text || 'No status';
            break;
          case 'people':
            const people = (columnValue as any).personsAndTeams || [];
            groupKey = people.length > 0 ? people.map((p: any) => p.id).join(',') : 'Unassigned';
            break;
          case 'date':
            groupKey = (columnValue as any).date || columnValue.text || 'No date';
            break;
          case 'numeric':
          case 'numbers':
            groupKey = columnValue.text || columnValue.value || 'No value';
            break;
          case 'checkbox':
            groupKey = (columnValue as any).checked ? 'Checked' : 'Unchecked';
            break;
          default:
            groupKey = columnValue.text || columnValue.value || 'No value';
        }
      }

      if (!valueGroups.has(groupKey)) {
        valueGroups.set(groupKey, []);
      }
      valueGroups.get(groupKey)!.push(item);
    });

    // Convert to MondayGroup format with colors from column values
    const dynamicGroups: MondayGroup[] = Array.from(valueGroups.entries()).map(([value, items], index) => {
      let groupColor = DEFAULT_GROUP_COLOR;
      
      // Get color from the first item's column value if grouping by status
      if (groupByColumn.type === 'status' && items.length > 0) {
        const firstItem = items[0];
        const columnValue = getColumnValue(firstItem, groupByColumnId);
        if (columnValue) {
          groupColor = getStatusColorFromValue(columnValue, groupByColumn);
        }
      }
      
      return {
        id: `group-by-${groupByColumnId}-${index}`,
        title: value,
        color: groupColor,
      };
    });

    return dynamicGroups;
  }, [originalGroups, groupByColumnId, columns, filteredItems, getColumnValue]);

  // Helper function to get items for a group (works with both original and dynamic groups)
  const getGroupItems = useCallback((groupId: string) => {
    if (groupByColumnId) {
      // For dynamic groups, items are already filtered by the group key
      const group = groups.find(g => g.id === groupId);
      if (!group) return [];

      const groupByColumn = columns.find(c => c.id === groupByColumnId);
      if (!groupByColumn) return [];

      return filteredItems.filter((item: MondayItem) => {
        const columnValue = getColumnValue(item, groupByColumnId);
        let groupKey = 'No value';

        if (columnValue) {
          switch (groupByColumn.type) {
            case 'status':
              groupKey = (columnValue as any).label || columnValue.text || 'No status';
              break;
            case 'people':
              const people = (columnValue as any).personsAndTeams || [];
              groupKey = people.length > 0 ? people.map((p: any) => p.id).join(',') : 'Unassigned';
              break;
            case 'date':
              groupKey = (columnValue as any).date || columnValue.text || 'No date';
              break;
            case 'numeric':
            case 'numbers':
              groupKey = columnValue.text || columnValue.value || 'No value';
              break;
            case 'checkbox':
              groupKey = (columnValue as any).checked ? 'Checked' : 'Unchecked';
              break;
            default:
              groupKey = columnValue.text || columnValue.value || 'No value';
          }
        }

        return group.title === groupKey;
      });
    } else {
      // Original groups
      return filteredItems.filter((item: MondayItem) => item.group?.id === groupId);
    }
  }, [groupByColumnId, groups, filteredItems, columns, getColumnValue]);

  // Initialize column widths, visibility, and order
  useEffect(() => {
    if (columns.length > 0) {
      // Always initialize to 150px for all columns (reset if needed)
      const initialWidths: ColumnWidth = {};
      const initialVisibility: ColumnVisibility = {};
      const initialOrder: string[] = [];

      // Initialize Task column width to 150px
      initialWidths[TASK_COLUMN_ID] = 150;

      columns.forEach((col: MondayColumn) => {
        // Skip Name and Subtasks columns - don't include them in initial setup
        if (col.type === 'name' || col.type === 'subtasks') {
          return;
        }
        // Always set to 150px initially - user can resize if needed
        initialWidths[col.id] = 150;
        initialVisibility[col.id] = true; // All visible by default
        initialOrder.push(col.id);
      });

      // Only update if columnWidths is empty (first load) or if we need to add new columns
      if (Object.keys(columnWidths).length === 0) {
        setColumnWidths(initialWidths);
        setColumnVisibility(initialVisibility);
        setColumnOrder(initialOrder);
      } else {
        // Add any new columns that don't have a width set yet
        const updatedWidths = { ...columnWidths };
        let hasNewColumns = false;
        columns.forEach((col: MondayColumn) => {
          if (col.type !== 'name' && col.type !== 'subtasks' && !updatedWidths[col.id]) {
            updatedWidths[col.id] = 150;
            hasNewColumns = true;
          }
        });
        if (hasNewColumns) {
          setColumnWidths(updatedWidths);
        }
      }
    }
  }, [columns, columnWidths, TASK_COLUMN_ID]);

  // Get visible and ordered columns
  const visibleColumns = useMemo(() => {
    const allVisible = columnOrder
      .map(id => columns.find(col => col.id === id))
      .filter((col): col is MondayColumn => 
        col !== undefined && 
        columnVisibility[col.id] !== false &&
        col.type !== 'name' && // Exclude Name column from visible columns
        col.type !== 'subtasks' // Exclude Subtasks column from visible columns
      );

    // Return all visible columns in order (no pinning)
    return allVisible;
  }, [columns, columnOrder, columnVisibility, pinnedColumns]);

  const handleItemClick = (itemId: string, e?: React.MouseEvent) => {
    if (e?.ctrlKey || e?.metaKey) {
      // Multi-select
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      setSelectedItemId(itemId);
      setDockOpen(true);
      setSelectedItems(new Set([itemId]));
    }
  };

  const handleCloseDock = () => {
    setDockOpen(false);
    setSelectedItemId(null);
  };

  const handleCreateItem = async (groupId: string) => {
    if (!newItemName.trim()) {
      showAlert({
        variant: 'error' as any,
        title: 'Please enter an item name',
      });
      return;
    }

    try {
      // Create item with only the name - no column values during creation
      // Users can edit other columns after the task is created
      await mondayService.createItem(boardId, groupId, newItemName.trim(), undefined);
      setNewItemName('');
      setActiveCreatingGroupId(null);
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Create item failed',
      });
    }
  };


  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setIsCreatingGroup(false);
      setNewGroupName('');
      return;
    }

    try {
      await mondayService.createGroup(boardId, newGroupName.trim());
      setIsCreatingGroup(false);
      setNewGroupName('');
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Create group failed',
      });
    }
  };

  const handleUpdateColumnName = async (columnId: string, newName: string) => {
    if (!newName.trim()) {
      return;
    }

    try {
      await mondayService.updateColumn(boardId, columnId, newName.trim());
      setShowColumnSettings(null);
      setEditingColumnName('');
      mutateBoard();
      showAlert({
        variant: 'success' as any,
        title: 'Column name updated successfully',
      });
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Update column name failed',
      });
    }
  };

  const handleRenameGroup = async (groupId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingGroupId(null);
      return;
    }

    try {
      await mondayService.updateGroup(boardId, groupId, 'title', newName.trim());
      setEditingGroupId(null);
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Rename group failed',
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!groupId) {
      showAlert({
        variant: 'error' as any,
        title: 'Group ID is missing',
      });
      return;
    }
    
    try {
      await mondayService.deleteGroup(boardId, groupId);
      setShowDeleteGroupConfirm(null);
      mutateBoard();
      showAlert({
        variant: 'success' as any,
        title: 'Group deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete group error:', error);
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Delete group failed',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await mondayService.deleteItem(itemId);
      setShowDeleteItemConfirm(null);
      if (selectedItemId === itemId) {
        setDockOpen(false);
        setSelectedItemId(null);
      }
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Delete item failed',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      const deletePromises = Array.from(selectedItems).map(itemId =>
        mondayService.deleteItem(itemId)
      );
      await Promise.all(deletePromises);

      if (selectedItemId && selectedItems.has(selectedItemId)) {
        setDockOpen(false);
        setSelectedItemId(null);
      }
      setSelectedItems(new Set());
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Delete items failed',
      });
    }
  };

  const handleBulkMove = async (targetGroupId: string) => {
    if (selectedItems.size === 0 || !targetGroupId) return;

    try {
      const movePromises = Array.from(selectedItems).map(itemId =>
        mondayService.moveItem(itemId, targetGroupId)
      );
      await Promise.all(movePromises);

      setSelectedItems(new Set());
      setShowBulkMoveDialog(false);
      setBulkMoveTargetGroup(null);
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Move items failed',
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await mondayService.deleteColumn(boardId, columnId);
      setShowDeleteColumnConfirm(null);
      mutateBoard();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Delete column failed',
      });
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const startResize = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnId] || 150); // Use current width or default to 150px
  };

  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    const diff = e.clientX - resizeStartX;
    const calculatedWidth = resizeStartWidth + diff;
    // Minimum width is 150px, but allow resizing to any larger size
    const newWidth = Math.max(150, calculatedWidth);
    setColumnWidths(prev => {
      const updated = {
        ...prev,
        [resizingColumn]: newWidth,
      };
      return updated;
    });
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const stopResize = useCallback(() => {
    setResizingColumn(null);
  }, []);


  const toggleColumnVisibility = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };
    }
  }, [resizingColumn, handleResize, stopResize]);

  // Close column menu when clicking outside
  // Global handler to close all dropdowns when clicking on any dropdown trigger
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if clicking on any dropdown trigger
      const isAnyDropdownTrigger = target.closest('[data-status-trigger]') || 
                                   target.closest('[data-date-trigger]') ||
                                   target.closest('[data-priority-trigger]') || 
                                   target.closest('[data-person-trigger]');
      
      // If clicking on a dropdown trigger, close all other dropdowns via custom event
      if (isAnyDropdownTrigger) {
        // Dispatch custom event to close all dropdowns
        window.dispatchEvent(new CustomEvent('closeAllDropdowns'));
      }
      
      // Close menus when clicking outside or on any dropdown trigger
      const isAnyDropdownPopup = target.closest('[data-status-popup]') || 
                                 target.closest('[data-date-calendar]') ||
                                 target.closest('[data-priority-popup]') || 
                                 target.closest('[data-person-popup]');
      
      if (showColumnMenu && !target.closest('[data-column-menu]') && !isAnyDropdownTrigger && !isAnyDropdownPopup) {
        setShowColumnMenu(false);
      }
      if (showGroupMenu && !target.closest('[data-group-menu]') && !isAnyDropdownTrigger && !isAnyDropdownPopup) {
        setShowGroupMenu(null);
      }
      if (showViewsMenu && !target.closest('[data-views-menu]') && !isAnyDropdownTrigger && !isAnyDropdownPopup) {
        setShowViewsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [showColumnMenu, showGroupMenu, showViewsMenu]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Escape to close modals/menus
      if (e.key === 'Escape') {
        setShowColumnMenu(false);
        setShowGroupMenu(null);
        setShowViewsMenu(false);
        setShowAddColumnDialog(false);
        setShowColumnSettings(null);
        setShowDeleteGroupConfirm(null);
        setShowDeleteItemConfirm(null);
        setShowDeleteColumnConfirm(null);
        setFocusedCell(null);
      }

      // Arrow keys for cell navigation (when not in edit mode)
      if (focusedCell && !editingGroupId && !isCreatingGroup) {
        const currentItemIndex = filteredItems.findIndex((item: MondayItem) => item.id === focusedCell.itemId);
        const currentColumnIndex = visibleColumns.findIndex((col: MondayColumn) => col.id === focusedCell.columnId);

        if (e.key === 'ArrowDown' && currentItemIndex < filteredItems.length - 1) {
          e.preventDefault();
          const nextItem = filteredItems[currentItemIndex + 1];
          setFocusedCell({ itemId: nextItem.id, columnId: focusedCell.columnId });
          // Scroll into view
          const element = document.querySelector(`[data-item-id="${nextItem.id}"][data-column-id="${focusedCell.columnId}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (e.key === 'ArrowUp' && currentItemIndex > 0) {
          e.preventDefault();
          const prevItem = filteredItems[currentItemIndex - 1];
          setFocusedCell({ itemId: prevItem.id, columnId: focusedCell.columnId });
          const element = document.querySelector(`[data-item-id="${prevItem.id}"][data-column-id="${focusedCell.columnId}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (e.key === 'ArrowRight' && currentColumnIndex < visibleColumns.length - 1) {
          e.preventDefault();
          const nextColumn = visibleColumns[currentColumnIndex + 1];
          setFocusedCell({ itemId: focusedCell.itemId, columnId: nextColumn.id });
          const element = document.querySelector(`[data-item-id="${focusedCell.itemId}"][data-column-id="${nextColumn.id}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (e.key === 'ArrowLeft' && currentColumnIndex > 0) {
          e.preventDefault();
          const prevColumn = visibleColumns[currentColumnIndex - 1];
          setFocusedCell({ itemId: focusedCell.itemId, columnId: prevColumn.id });
          const element = document.querySelector(`[data-item-id="${focusedCell.itemId}"][data-column-id="${prevColumn.id}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          // Trigger edit mode for the focused cell
          const element = document.querySelector(`[data-item-id="${focusedCell.itemId}"][data-column-id="${focusedCell.columnId}"]`);
          (element as HTMLElement)?.click();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          // Move to next cell (right, then wrap to next row)
          if (currentColumnIndex < visibleColumns.length - 1) {
            const nextColumn = visibleColumns[currentColumnIndex + 1];
            setFocusedCell({ itemId: focusedCell.itemId, columnId: nextColumn.id });
          } else if (currentItemIndex < filteredItems.length - 1) {
            const nextItem = filteredItems[currentItemIndex + 1];
            const firstColumn = visibleColumns[0];
            if (firstColumn) {
              setFocusedCell({ itemId: nextItem.id, columnId: firstColumn.id });
            }
          }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          // Delete selected items
          if (selectedItems.size > 0) {
            e.preventDefault();
            if (confirm(`Delete ${selectedItems.size} item(s)?`)) {
              handleBulkDelete();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, filteredItems, visibleColumns, editingGroupId, isCreatingGroup]);


  const renderNewItemCell = (column: MondayColumn) => {
    // Only show read-only placeholders for all columns during task creation
    // Task name input is handled separately in the table row
    // Users can edit other columns after the task is created

    const getPlaceholder = () => {
      switch (column.type) {
        case 'people':
          return 'Unassigned';
        case 'status':
          return 'Not Started';
        case 'date':
          return '-';
        case 'numeric':
        case 'numbers':
          return '-';
        case 'checkbox':
          return '';
        case 'last_updated':
          return '-';
        case 'file':
          return '-';
        case 'timeline':
          return '-';
        case 'tags':
          return '-';
        case 'name':
          return '-'; // Name is handled in separate input field
        default:
          return '-';
      }
    };

    const placeholder = getPlaceholder();

    return (
      <div
        style={{
          padding: '8px 12px',
          minHeight: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: column.type === 'checkbox' ? 'center' : 'flex-start',
          color: carterColors['text-500'],
          fontSize: '13px',
          cursor: 'default',
        }}
      >
        <div style={{ fontSize: '13px' }}>
          <Typography variant="body-regular" color={carterColors['text-500']}>
            {placeholder}
          </Typography>
        </div>
      </div>
    );

  };

  const renderCell = (item: MondayItem, column: MondayColumn) => {
    const columnValue = getColumnValue(item, column.id);

    // Render based on column type
    switch (column.type) {
      case 'status':
        return (
          <StatusCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            settings={column.settings_str}
            onUpdate={mutateBoard}
          />
        );
      case 'date':
        return (
          <DateCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'people':
        return (
          <PersonCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'numeric':
      case 'numbers':
        return (
          <NumberCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'file':
        return (
          <FileCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'timeline':
        return (
          <TimelineCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'checkbox':
        return (
          <CheckboxCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'tags':
        return (
          <TagsCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
      case 'priority':
        return (
          <PriorityCell
            value={columnValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            settings={column.settings_str}
            onUpdate={mutateBoard}
          />
        );
      case 'last_updated':
        // Display last updated time in relative format
        // Try multiple sources: item.updated_at (most reliable), then columnValue.value (might be JSON), then columnValue.text
        let lastUpdateDate: string | Date | null | undefined = item.updated_at;
        
        if (!lastUpdateDate && columnValue?.value) {
          // Try parsing as JSON (Monday.com often stores dates as JSON strings)
          if (typeof columnValue.value === 'string') {
            try {
              const parsed = JSON.parse(columnValue.value);
              if (parsed.date) {
                lastUpdateDate = parsed.date;
              } else if (parsed.updated_at) {
                lastUpdateDate = parsed.updated_at;
              } else if (typeof parsed === 'string') {
                lastUpdateDate = parsed;
              } else {
                lastUpdateDate = columnValue.value;
              }
            } catch {
              // Not JSON, use as-is
              lastUpdateDate = columnValue.value;
            }
          } else {
            lastUpdateDate = columnValue.value;
          }
        }
        
        if (!lastUpdateDate && columnValue?.text) {
          lastUpdateDate = columnValue.text;
        }
        
        return (
          <div
            className={styles.monday_cell}
            style={{
              padding: '8px 12px',
              minWidth: '150px',
            }}
          >
            <div style={{ fontSize: '12px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                {formatRelativeTime(lastUpdateDate)}
              </Typography>
            </div>
          </div>
        );
      default:
        // Handle different value formats - parse JSON if needed
        let displayValue = '';
        
        // Helper function to recursively extract text from nested JSON
        const extractTextFromValue = (val: any, depth: number = 0): string => {
          // Prevent infinite recursion
          if (depth > 5) return '';
          
          if (!val) return '';
          
          // If it's a string, try to parse it
          if (typeof val === 'string') {
            const trimmed = val.trim();
            // Check if it looks like JSON
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                const parsed = JSON.parse(val);
                // Recursively try to extract text
                return extractTextFromValue(parsed, depth + 1);
              } catch {
                // If parsing fails but it looks like JSON, return empty
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  return '';
                }
                // Otherwise, it's a plain string
                return trimmed;
              }
            }
            // Plain string
            return trimmed;
          }
          
          // If it's an object
          if (typeof val === 'object' && val !== null) {
            // Check for link columns
            if (val.linkedPulseIds && Array.isArray(val.linkedPulseIds)) {
              const linkCount = val.linkedPulseIds.length;
              return linkCount > 0 ? `${linkCount} linked item${linkCount > 1 ? 's' : ''}` : '';
            }
            // Check for text property
            if (val.text && typeof val.text === 'string' && val.text.trim()) {
              // Recursively check if text itself is JSON
              const extracted = extractTextFromValue(val.text, depth + 1);
              if (extracted) return extracted;
            }
            // If no meaningful data found, return empty
            return '';
          }
          
          // For other types, convert to string if meaningful
          const str = String(val);
          if (str && str !== 'null' && str !== 'undefined') {
            return str;
          }
          return '';
        };
        
        if (columnValue?.text) {
          // Try to extract meaningful text from the text property
          const extracted = extractTextFromValue(columnValue.text);
          if (extracted) {
            displayValue = extracted;
          }
        }
        
        // If we still don't have a value, try the value property
        if (!displayValue && columnValue?.value) {
          const extracted = extractTextFromValue(columnValue.value);
          if (extracted) {
            displayValue = extracted;
          }
        }
        
        // If we still don't have a meaningful value, show "-"
        if (!displayValue || displayValue.trim() === '') {
          displayValue = '-';
        }
        
        return (
          <TextCell
            value={displayValue}
            itemId={item.id}
            columnId={column.id}
            boardId={boardId}
            onUpdate={mutateBoard}
          />
        );
    }
  };

  if (boardError) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <AlertCircle size={48} color={carterColors['red-700']} />
        <div style={{ marginTop: '16px' }}>
          <Typography variant="h3-semibold" color={carterColors['red-700']}>
            Failed to load board
          </Typography>
        </div>
        <Button
          variant="secondary"
          size="medium"
          label="Go Back"
          icon={<ArrowLeft size={16} />}
          onClick={() => router.push(ROUTES.CRM.MONDAY.DATA)}
          style={{ marginTop: '16px' }}
        />
      </div>
    );
  }

  if (!board && !boardError) {
    return (
      <div 
        style={{
          backgroundColor: carterColors['grey-100'],
          minHeight: '100vh',
        }}
      >
        {/* Board Header Skeleton */}
        <div style={{
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          zIndex: 100,
          backgroundColor: 'white',
          borderBottom: `1px solid ${carterColors['grey-200']}`,
          padding: '16px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Back arrow */}
            <Skeleton 
              variant="circular" 
              width={32} 
              height={32} 
              style={{ 
                flexShrink: 0,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} 
            />
            {/* Logo */}
            <Skeleton 
              variant="rectangular" 
              width={32} 
              height={32} 
              style={{ 
                borderRadius: '6px',
                flexShrink: 0,
                animation: 'pulse 1.5s ease-in-out infinite 0.2s'
              }} 
            />
            {/* Title */}
            <Skeleton 
              variant="text" 
              width={280} 
              height={24} 
              style={{ 
                animation: 'pulse 1.5s ease-in-out infinite 0.4s'
              }} 
            />
          </div>
        </div>

        {/* Toolbar Skeleton */}
        <div style={{
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          zIndex: 99,
          backgroundColor: 'white',
          borderBottom: `1px solid ${carterColors['grey-200']}`,
          padding: '12px 24px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            {/* Search input */}
            <Skeleton 
              variant="rectangular" 
              width={360} 
              height={40} 
              style={{ 
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} 
            />
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Skeleton 
                variant="rectangular" 
                width={100} 
                height={36} 
                style={{ 
                  borderRadius: '6px',
                  animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                }} 
              />
              <Skeleton 
                variant="rectangular" 
                width={100} 
                height={36} 
                style={{ 
                  borderRadius: '6px',
                  animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                }} 
              />
              <Skeleton 
                variant="rectangular" 
                width={100} 
                height={36} 
                style={{ 
                  borderRadius: '6px',
                  animation: 'pulse 1.5s ease-in-out infinite 0.6s'
                }} 
              />
              <Skeleton 
                variant="rectangular" 
                width={120} 
                height={36} 
                style={{ 
                  borderRadius: '6px',
                  animation: 'pulse 1.5s ease-in-out infinite 0.8s'
                }} 
              />
              <Skeleton 
                variant="rectangular" 
                width={110} 
                height={36} 
                style={{ 
                  borderRadius: '6px',
                  animation: 'pulse 1.5s ease-in-out infinite 1s'
                }} 
              />
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div style={{ padding: '0' }}>
          {/* Group Header Skeleton */}
          <div style={{
            background: `linear-gradient(90deg, ${carterColors['grey-100']} 0%, ${carterColors['grey-200']} 50%, ${carterColors['grey-100']} 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite linear',
            borderTop: `1px solid ${carterColors['grey-300']}`,
            borderBottom: `1px solid ${carterColors['grey-300']}`,
            padding: '12px 20px',
            marginBottom: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0 }} />
            <Skeleton variant="circular" width={12} height={12} style={{ flexShrink: 0 }} />
            <Skeleton variant="text" width={140} height={20} />
            <Skeleton variant="rectangular" width={32} height={20} style={{ borderRadius: '12px' }} />
          </div>

          {/* Table Header Skeleton */}
          <div style={{
            backgroundColor: 'white',
            border: `1px solid ${carterColors['grey-200']}`,
            borderTop: 'none',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              borderBottom: `2px solid ${carterColors['grey-200']}`,
              backgroundColor: carterColors['grey-100'],
              height: '48px',
            }}>
              {/* Checkbox column */}
              <div style={{ 
                width: '50px', 
                height: '48px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="rectangular" width={18} height={18} style={{ borderRadius: '4px' }} />
              </div>
              {/* Name column */}
              <div style={{ 
                width: '280px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="rectangular" width={12} height={12} style={{ borderRadius: '2px', flexShrink: 0 }} />
                <Skeleton variant="text" width={100} height={16} />
                <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0, marginLeft: 'auto' }} />
              </div>
              {/* Item ID column */}
              <div style={{ 
                width: '160px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="rectangular" width={12} height={12} style={{ borderRadius: '2px', flexShrink: 0 }} />
                <Skeleton variant="text" width={80} height={16} />
                <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0, marginLeft: 'auto' }} />
              </div>
              {/* Start Date column */}
              <div style={{ 
                width: '150px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="rectangular" width={12} height={12} style={{ borderRadius: '2px', flexShrink: 0 }} />
                <Skeleton variant="text" width={70} height={16} />
                <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0, marginLeft: 'auto' }} />
              </div>
              {/* End Date column */}
              <div style={{ 
                width: '150px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="rectangular" width={12} height={12} style={{ borderRadius: '2px', flexShrink: 0 }} />
                <Skeleton variant="text" width={70} height={16} />
                <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0, marginLeft: 'auto' }} />
              </div>
              {/* Account column */}
              <div style={{ 
                width: '180px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="rectangular" width={12} height={12} style={{ borderRadius: '2px', flexShrink: 0 }} />
                <Skeleton variant="text" width={90} height={16} />
                <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0, marginLeft: 'auto' }} />
              </div>
              {/* Campaign Item column */}
              <div style={{ 
                flex: 1,
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Skeleton variant="rectangular" width={12} height={12} style={{ borderRadius: '2px', flexShrink: 0 }} />
                <Skeleton variant="text" width={100} height={16} />
                <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0, marginLeft: 'auto' }} />
              </div>
            </div>

            {/* Table Rows Skeleton */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
              <div 
                key={i} 
                style={{
                  display: 'flex',
                  borderBottom: i < 13 ? `1px solid ${carterColors['grey-100']}` : 'none',
                  backgroundColor: 'white',
                  height: '56px',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {/* Checkbox column */}
                <div style={{ 
                  width: '50px', 
                  height: '56px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton variant="rectangular" width={18} height={18} style={{ borderRadius: '4px' }} />
                </div>
                {/* Drag handle */}
                <div style={{ 
                  width: '24px', 
                  height: '56px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton variant="rectangular" width={8} height={16} style={{ borderRadius: '2px' }} />
                </div>
                {/* Name column */}
                <div style={{ 
                  width: '256px', 
                  height: '56px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton variant="text" width={i % 3 === 0 ? '85%' : i % 3 === 1 ? '75%' : '90%'} height={16} />
                </div>
                {/* Item ID column */}
                <div style={{ 
                  width: '136px', 
                  height: '56px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton variant="text" width={100} height={16} />
                </div>
                {/* Start Date column */}
                <div style={{ 
                  width: '134px', 
                  height: '56px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0 }} />
                  <Skeleton variant="text" width={50} height={16} />
                </div>
                {/* End Date column */}
                <div style={{ 
                  width: '134px', 
                  height: '56px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton variant="circular" width={16} height={16} style={{ flexShrink: 0 }} />
                  <Skeleton variant="text" width={50} height={16} />
                </div>
                {/* Account column - Badge */}
                <div style={{ 
                  width: '164px', 
                  height: '56px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRight: `1px solid ${carterColors['grey-100']}`
                }}>
                  <Skeleton 
                    variant="rectangular" 
                    width={i % 4 === 0 ? 90 : i % 4 === 1 ? 100 : i % 4 === 2 ? 85 : 95} 
                    height={28} 
                    style={{ 
                      borderRadius: '16px'
                    }} 
                  />
                </div>
                {/* Campaign Item column - Badge */}
                <div style={{ 
                  flex: 1,
                  height: '56px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <Skeleton 
                    variant="rectangular" 
                    width={i % 3 === 0 ? 120 : i % 3 === 1 ? 110 : 115} 
                    height={28} 
                    style={{ 
                      borderRadius: '16px'
                    }} 
                  />
                </div>
              </div>
            ))}

            {/* Add Item Row Skeleton */}
            <div style={{
              display: 'flex',
              borderTop: `1px solid ${carterColors['grey-200']}`,
              backgroundColor: carterColors['grey-100'],
              height: '48px',
              padding: '0 20px',
              alignItems: 'center',
            }}>
              <div style={{ 
                width: '50px', 
                height: '48px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }} />
              <div style={{ 
                width: '24px', 
                height: '48px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }} />
              <div style={{ 
                width: '256px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="text" width={80} height={16} style={{ color: carterColors['text-400'] }} />
              </div>
              <div style={{ 
                width: '136px', 
                height: '48px', 
                borderRight: `1px solid ${carterColors['grey-200']}`
              }} />
              <div style={{ 
                width: '134px', 
                height: '48px', 
                borderRight: `1px solid ${carterColors['grey-200']}`
              }} />
              <div style={{ 
                width: '134px', 
                height: '48px', 
                borderRight: `1px solid ${carterColors['grey-200']}`
              }} />
              <div style={{ 
                width: '164px', 
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                borderRight: `1px solid ${carterColors['grey-200']}`
              }}>
                <Skeleton variant="text" width={70} height={14} style={{ color: carterColors['text-400'] }} />
              </div>
              <div style={{ 
                flex: 1,
                height: '48px', 
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <Skeleton variant="text" width={70} height={14} style={{ color: carterColors['text-400'] }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!board) {
    return null;
  }

  const checkboxColumnWidth = 40;
  
  // Get task column width from state or use default
  const taskColumnWidth = columnWidths[TASK_COLUMN_ID] || 150;
  
  // Get the name column title (first column)
  const nameColumn = columns.find((col: MondayColumn) => col.type === 'name');
  const taskColumnTitle = nameColumn?.title || 'Task';

  // Sortable Column Header Component
  // eslint-disable-next-line react/no-unstable-nested-components
  const SortableColumnHeader: React.FC<{ column: MondayColumn }> = ({ column }) => {
    const [showMenu, setShowMenu] = useState(false);

    const width = columnWidths[column.id] || 150; // Use stored width or default to 150px
    const isSorted = sortConfig.columnId === column.id;
    const sortDirection = sortConfig.direction;

    return (
      <th
        style={{
          width: `${width}px`,
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
          padding: '12px 16px',
          fontWeight: 600,
          fontSize: '12px',
          color: carterColors['text-700'],
          backgroundColor: 'white',
          borderRight: `1px solid ${carterColors['grey-200']}`,
          borderBottom: `2px solid ${carterColors['grey-200']}`,
          transition: resizingColumn === column.id ? 'none' : 'background-color 0.2s ease',
          position: 'sticky' as const,
          top: 0,
          zIndex: 20,
          textAlign: 'left',
          verticalAlign: 'middle',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = carterColors['grey-100'];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', position: 'relative' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
            <TruncatedText
              text={column.title}
              style={{ 
                fontSize: '12px', 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
                fontWeight: 600,
                color: carterColors['text-600'],
              }}
            >
              {column.title}
            </TruncatedText>
            {isSorted && (
              sortDirection === 'asc' ? (
                <SortAsc size={12} color={carterColors['brand-600']} />
              ) : (
                <SortDesc size={12} color={carterColors['brand-600']} />
              )
            )}
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                // Toggle: if open, close it; if closed, open it
                if (showMenu) {
                  setShowMenu(false);
                } else {
                  setShowMenu(true);
                }
              }}
              style={{ cursor: 'pointer', padding: '2px' }}
            >
              <MoreVertical size={12} color={carterColors['text-400']} style={{ opacity: 0.6 }} />
            </div>
            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: `1px solid ${carterColors['grey-200']}`,
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '150px',
                  zIndex: 1000,
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  transform: 'translateY(0)',
                  opacity: 1,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => {
                    setSortConfig({
                      columnId: column.id,
                      direction: isSorted && sortDirection === 'asc' ? 'desc' : 'asc',
                    });
                    setShowMenu(false);
                  }}
                >
                  {isSorted && sortDirection === 'asc' ? (
                    <SortDesc size={12} color={carterColors['text-600']} />
                  ) : (
                    <SortAsc size={12} color={carterColors['text-600']} />
                  )}
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    Sort {isSorted && sortDirection === 'asc' ? 'Descending' : 'Ascending'}
                  </Typography>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => {
                    toggleColumnVisibility(column.id);
                    setShowMenu(false);
                  }}
                >
                  <EyeOff size={12} color={carterColors['text-600']} />
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    Hide Column
                  </Typography>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => {
                    setShowColumnSettings(column.id);
                    setEditingColumnName(column.title);
                    setShowMenu(false);
                  }}
                >
                  <Edit2 size={12} color={carterColors['text-600']} />
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    Edit Column
                  </Typography>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: `1px solid ${carterColors['grey-200']}`,
                    marginTop: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['red-200'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => {
                    setShowDeleteColumnConfirm(column.id);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 size={12} color={carterColors['red-700']} />
                  <Typography variant="body-regular" color={carterColors['red-700']}>
                    Delete Column
                  </Typography>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Column Resizer Handle - positioned on the border */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startResize(column.id, e);
          }}
          style={{
            position: 'absolute',
            right: '-6px',
            top: 0,
            bottom: 0,
            width: '12px',
            cursor: 'col-resize',
            backgroundColor: 'transparent',
            zIndex: 101,
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            if (resizingColumn !== column.id) {
              const line = e.currentTarget.querySelector('div') as HTMLElement;
              if (line) {
                line.style.width = '3px';
                line.style.backgroundColor = carterColors['brand-400'];
              }
            }
          }}
          onMouseLeave={(e) => {
            if (resizingColumn !== column.id) {
              const line = e.currentTarget.querySelector('div') as HTMLElement;
              if (line) {
                line.style.width = '2px';
                line.style.backgroundColor = carterColors['grey-300'];
              }
            }
          }}
        >
          <div
            style={{
              width: '2px',
              height: '100%',
              backgroundColor: resizingColumn === column.id 
                ? carterColors['brand-600'] 
                : carterColors['grey-300'],
              transition: 'width 0.2s ease, background-color 0.2s ease',
            }}
          />
        </div>
      </th>
    );
  };


  return (
      <div 
        className={styles.monday_board_view_container} 
        onClick={() => setShowColumnMenu(false)}
        style={{
          backgroundColor: carterColors['grey-100'],
          minHeight: '100vh',
        }}
      >
        {!hideHeader && (
          <div className={styles.monday_board_header} style={{
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            zIndex: 100,
            backgroundColor: 'white',
            borderBottom: `1px solid ${carterColors['grey-200']}`,
            padding: '16px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Button
                variant="tertiary"
                size="small"
                icon={<ArrowLeft size={18} />}
                onClick={() => router.push(ROUTES.CRM.MONDAY.DATA)}
                style={{
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqIvjWjRTI1JvYoPEfUp3ielEzlFHcJGfSjg&s"
                alt="Monday.com"
                style={{
                  width: '32px',
                  height: '32px',
                  objectFit: 'contain',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '20px', lineHeight: '28px' }}>
                  <Typography variant="h2-semibold" color={carterColors['text-900']}>
                    {board.name}
                  </Typography>
                </div>
                {board.description && (
                  <div style={{ fontSize: '13px' }}>
                    <Typography variant="body-regular" color={carterColors['text-500']}>
                      {board.description}
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className={styles.monday_board_toolbar} style={{
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          zIndex: 99,
          backgroundColor: carterColors['grey-100'],
          borderBottom: `1px solid ${carterColors['grey-200']}`,
          padding: '12px 24px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            {/* View Switcher */}
            <div style={{
              display: 'flex',
              gap: '4px',
              border: `1px solid ${carterColors['grey-300']}`,
              borderRadius: '6px',
              padding: '2px',
              backgroundColor: 'white',
            }}>
            </div>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px', minWidth: '200px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: carterColors['text-400'],
                  zIndex: 1,
                }}
              />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 40px',
                  border: `1px solid ${carterColors['grey-300']}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = carterColors['brand-600'];
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = carterColors['grey-300'];
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={12} color={carterColors['text-400']} />
                </button>
              )}
            </div>
            {filters.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                {filters.map((filter, idx) => {
                  const column = columns.find(c => c.id === filter.columnId);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: carterColors['brand-100'],
                        borderRadius: '4px',
                      }}
                    >
                      <Typography variant="caption-regular" color={carterColors['brand-600']}>
                        {column?.title}: {filter.value}
                      </Typography>
                      <X
                        size={12}
                        color={carterColors['brand-600']}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setFilters(filters.filter((_, i) => i !== idx));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {sortConfig.columnId && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: carterColors['brand-100'],
                  borderRadius: '4px',
                }}
              >
                <Typography variant="caption-regular" color={carterColors['brand-600']}>
                  Sorted by {columns.find(c => c.id === sortConfig.columnId)?.title} ({sortConfig.direction})
                </Typography>
                <X
                  size={12}
                  color={carterColors['brand-600']}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortConfig({ columnId: null, direction: null });
                  }}
                />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Button
                variant="tertiary"
                size="small"
                label="Columns"
                icon={<Settings size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle: if open, close it; if closed, open it
                  if (showColumnMenu) {
                    setShowColumnMenu(false);
                  } else {
                    setShowColumnMenu(true);
                  }
                }}
                style={{
                  height: '36px',
                  padding: '8px 16px',
                  backgroundColor: carterColors['grey-100'],
                  borderColor: carterColors['grey-300'],
                  color: carterColors['text-700'],
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                }}
              />
              {showColumnMenu && (
                <div
                  data-column-menu
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: 'white',
                    border: `1px solid ${carterColors['grey-200']}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '8px',
                    minWidth: '200px',
                    zIndex: 1000,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: '8px', borderBottom: `1px solid ${carterColors['grey-200']}`, marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Show/Hide Columns
                    </Typography>
                  </div>
                  <div
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                    }}
                  >
                    {columns.map((column: MondayColumn) => (
                      <label
                        key={column.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={columnVisibility[column.id] !== false}
                          onChange={() => toggleColumnVisibility(column.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {column.title}
                        </Typography>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="tertiary"
              size="small"
              label={groupByColumnId ? `Grouped by ${columns.find(c => c.id === groupByColumnId)?.title}` : "Group by"}
              icon={<Grid3x3 size={14} />}
              onClick={() => setShowGroupByDialog(true)}
              style={{
                height: '36px',
                padding: '8px 16px',
                backgroundColor: carterColors['grey-100'],
                borderColor: carterColors['grey-300'],
                color: carterColors['text-700'],
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '6px',
              }}
            />
            {groupByColumnId && (
              <Button
                variant="tertiary"
                size="small"
                label="Clear grouping"
                icon={<X size={14} />}
                onClick={() => {
                  handleGroupByChange(null);
                }}
                style={{
                  height: '36px',
                  padding: '8px 16px',
                  backgroundColor: '#fff5eb',
                  borderColor: '#ffc285',
                  color: '#f77f00',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                }}
              />
            )}
            <div style={{ position: 'relative' }}>
              <Button
                variant="tertiary"
                size="small"
                label={
                  currentViewId
                    ? savedViews.find(v => v.id === currentViewId)?.name || "Views"
                    : `Views${
                        board.views && Array.isArray(board.views) && board.views.length > 0
                          ? ` (${board.views.length})`
                          : ''
                      }`
                }
                icon={<Grid3x3 size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewsMenu(!showViewsMenu);
                }}
                style={{
                  height: '36px',
                  padding: '8px 16px',
                  backgroundColor: currentViewId ? carterColors['brand-100'] : carterColors['grey-100'],
                  borderColor: currentViewId ? carterColors['brand-300'] : carterColors['grey-300'],
                  color: currentViewId ? carterColors['brand-700'] : carterColors['text-700'],
                  fontSize: '13px',
                  fontWeight: currentViewId ? 600 : 500,
                  borderRadius: '6px',
                }}
              />
              {showViewsMenu && (
                <div
                  data-views-menu
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    backgroundColor: 'white',
                    border: `1px solid ${carterColors['grey-200']}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '250px',
                    zIndex: 1000,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Monday.com Board Views */}
                  {board.views && Array.isArray(board.views) && board.views.length > 0 && (
                    <>
                      <div style={{ padding: '8px', borderBottom: `1px solid ${carterColors['grey-200']}`, marginBottom: '8px' }}>
                        <Typography variant="body-semibold" color={carterColors['text-900']}>
                          Monday.com Views
                        </Typography>
                      </div>
                      <div
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          marginBottom: '8px',
                        }}
                      >
                        {board.views.map((view) => (
                          <div
                            key={view.id}
                            onClick={() => {
                              // Open view in Monday.com
                              window.open(`https://monday.com/boards/${boardId}/views/${view.id}`, '_blank');
                              setShowViewsMenu(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Grid3x3 size={16} color={carterColors['text-600']} />
                            <div style={{ flex: 1 }}>
                              <Typography variant="body-regular" color={carterColors['text-900']}>
                                {view.name}
                              </Typography>
                              <Typography variant="caption-regular" color={carterColors['text-500']}>
                                {view.type}
                              </Typography>
                            </div>
                            <ArrowRight size={14} color={carterColors['text-400']} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Saved Views */}
                  <div style={{
                    padding: '8px',
                    borderTop: board.views && Array.isArray(board.views) && board.views.length > 0
                      ? `1px solid ${carterColors['grey-200']}`
                      : 'none',
                    borderBottom: `1px solid ${carterColors['grey-200']}`,
                    marginBottom: '8px',
                    marginTop: board.views && Array.isArray(board.views) && board.views.length > 0
                      ? '8px'
                      : '0',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Saved Views
                      </Typography>
                    </div>
                  </div>
                  {savedViews.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <Typography variant="body-regular" color={carterColors['text-500']}>
                        No saved views
                      </Typography>
                    </div>
                  ) : (
                    savedViews.map((view) => (
                      <div
                        key={view.id}
                        style={{
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: currentViewId === view.id ? carterColors['brand-100'] : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (currentViewId !== view.id) {
                            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentViewId !== view.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={() => {
                          loadView(view.id);
                          setShowViewsMenu(false);
                        }}
                      >
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {view.name}
                        </Typography>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {currentViewId === view.id && (
                            <div style={{ fontSize: '10px', color: carterColors['brand-600'] }}>
                              Active
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete view "${view.name}"?`)) {
                                handleDeleteView(view.id);
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Trash2 size={12} color={carterColors['red-700']} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <div style={{ padding: '8px', borderTop: `1px solid ${carterColors['grey-200']}`, marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        setShowSaveViewDialog(true);
                        setShowViewsMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: carterColors['brand-100'],
                        border: `1px solid ${carterColors['brand-200']}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: carterColors['brand-700'],
                      }}
                    >
                      + Save Current View
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
              <Button
                variant="secondary"
                size="small"
                icon={<Plus size={16} />}
                label="Add Group"
                onClick={() => {
                  setIsCreatingGroup(true);
                }}
                style={{
                  height: '36px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              />
              <Button
                variant="primary"
                size="small"
                icon={<Plus size={16} />}
                label="New item"
                onClick={async () => {
                  if (groups.length > 0) {
                    const firstGroupId = groups[0].id;
                    try {
                      await mondayService.createItem(boardId, firstGroupId, 'New Task', undefined);
                      mutateBoard();
                    } catch (error: any) {
                      showAlert({
                        variant: 'error' as any,
                        title: error?.message || 'Create task failed',
                      });
                    }
                  }
                }}
                disabled={groups.length === 0}
                style={{
                  height: '36px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.monday_board_content} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Board Table */}
            <div
              ref={tableRef}
              className={styles.monday_table_wrapper}
              style={{
                flex: '1 1 100%',
                paddingBottom: selectedItems.size > 0 ? '200px' : '0',
                transition: 'padding-bottom 0.3s ease, flex 0.3s ease',
                position: 'relative' as const,
                overflow: 'auto',
                height: '100%',
              }}
            >
              {/* Groups - Each group has its own table */}
              {groups.map((group: MondayGroup) => {
                  const groupItems = getGroupItems(group.id);
                  const isCollapsed = collapsedGroups.has(group.id);
                  const isEditing = editingGroupId === group.id;

                  if (groupItems.length === 0 && searchQuery) return null;

                  return (
                    <div 
                      key={group.id} 
                      style={{ 
                        marginBottom: '32px', 
                        width: 'max-content', 
                        minWidth: '100%',
                      }}
                    >
                      {/* Group Header - Modern Design */}
                      <div
                        style={{
                          backgroundColor: carterColors['grey-100'],
                          borderLeft: `4px solid ${group.color || DEFAULT_GROUP_COLOR}`,
                          borderTop: `1px solid ${carterColors['grey-300']}`,
                          borderBottom: `1px solid ${carterColors['grey-300']}`,
                          borderRight: `1px solid ${carterColors['grey-300']}`,
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontWeight: 600,
                          fontSize: '14px',
                          marginBottom: '0',
                          borderRadius: '8px 8px 0 0',
                          width: 'max-content',
                          minWidth: '100%',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                          transition: 'all 0.2s ease',
                          color: group.color && group.color.trim() ? group.color : DEFAULT_GROUP_COLOR,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = carterColors['grey-200'];
                          e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
                        }}
                      >
                        <div
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onClick={() => toggleGroupCollapse(group.id)}
                        >
                          {isCollapsed ? (
                            <ChevronRight size={16} color={carterColors['text-700']} />
                          ) : (
                            <ChevronDown size={16} color={carterColors['text-700']} />
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onBlur={() => {
                              handleRenameGroup(group.id, editingGroupName);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameGroup(group.id, editingGroupName);
                              } else if (e.key === 'Escape') {
                                setEditingGroupId(null);
                                setEditingGroupName('');
                              }
                            }}
                            autoFocus
                            style={{
                              flex: 1,
                              border: `1px solid ${carterColors['brand-600']}`,
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                        ) : (
                          <>
                            <div
                              style={{ flex: 1, cursor: 'pointer' }}
                              onClick={() => {
                                setEditingGroupId(group.id);
                                setEditingGroupName(group.title);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                                  <span style={{
                                    color: group.color && group.color.trim() ? group.color : DEFAULT_GROUP_COLOR,
                                    fontWeight: 700,
                                    letterSpacing: '0.2px',
                                  }}>
                                    {group.title}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    backgroundColor: group.color && group.color.trim() ? `${group.color}15` : 'rgba(0,0,0,0.08)',
                                    border: `1px solid ${group.color && group.color.trim() ? `${group.color}30` : 'rgba(0,0,0,0.2)'}`,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: group.color && group.color.trim() ? group.color : DEFAULT_GROUP_COLOR,
                                    minWidth: '24px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {groupItems.length}
                                </div>
                              </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <Button
                                variant="tertiary"
                                size="small"
                                icon={<MoreVertical size={12} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowGroupMenu(showGroupMenu === group.id ? null : group.id);
                                }}
                              />
                              {showGroupMenu === group.id && (
                                <div
                                  data-group-menu
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: 'white',
                                    border: `1px solid ${carterColors['grey-200']}`,
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    minWidth: '180px',
                                    zIndex: 1000,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    style={{
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      borderRadius: '4px',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGroupId(group.id);
                                      setEditingGroupName(group.title);
                                      setShowGroupMenu(null);
                                    }}
                                  >
                                    <Edit2 size={14} color={carterColors['text-600']} />
                                    <Typography variant="body-regular" color={carterColors['text-900']}>
                                      Rename Group
                                    </Typography>
                                  </div>
                                  <div
                                    style={{
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      borderRadius: '4px',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteGroupConfirm(group.id);
                                      setShowGroupMenu(null);
                                    }}
                                  >
                                    <Trash2 size={14} color={carterColors['red-700']} />
                                    <Typography variant="body-regular" color={carterColors['red-700']}>
                                      Delete Group
                                    </Typography>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Group Table - Only show if not collapsed */}
                      {!isCollapsed && (
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '0 0 8px 8px',
                          border: `1px solid ${carterColors['grey-200']}`,
                          borderTop: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          overflow: 'hidden',
                        }}>
                        <table className={styles.monday_table} style={{ 
                          width: 'max-content', 
                          minWidth: '100%', 
                          display: 'table',
                          borderCollapse: 'separate',
                          borderSpacing: 0,
                          tableLayout: 'fixed',
                        }}>
                          <thead
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 20,
                              backgroundColor: 'white',
                              borderBottom: `2px solid ${carterColors['grey-200']}`,
                            }}
                          >
                            <tr>
                              {/* Checkbox Column */}
                              <th
                                style={{
                                  width: `${checkboxColumnWidth}px`,
                                  minWidth: `${checkboxColumnWidth}px`,
                                  padding: '12px 8px',
                                  backgroundColor: 'white',
                                  borderRight: `1px solid ${carterColors['grey-200']}`,
                                  borderBottom: `2px solid ${carterColors['grey-200']}`,
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  position: 'sticky' as const,
                                  top: 0,
                                  zIndex: 20,
                                  transition: 'background-color 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedItems.size > 0 && 
                                    selectedItems.size === groupItems.length && 
                                    groupItems.every((item: MondayItem) => selectedItems.has(item.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const newSelected = new Set(selectedItems);
                                      groupItems.forEach((item: MondayItem) => newSelected.add(item.id));
                                      setSelectedItems(newSelected);
                                    } else {
                                      const newSelected = new Set(selectedItems);
                                      groupItems.forEach((item: MondayItem) => newSelected.delete(item.id));
                                      setSelectedItems(newSelected);
                                    }
                                  }}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </th>
                              {/* Task Column */}
                              <th
                                style={{
                                  width: `${taskColumnWidth}px`,
                                  padding: '12px 16px',
                                  fontWeight: 600,
                                  fontSize: '10px',
                                  color: carterColors['text-700'],
                                  backgroundColor: 'white',
                                  borderRight: `1px solid ${carterColors['grey-200']}`,
                                  borderBottom: `2px solid ${carterColors['grey-200']}`,
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  position: 'sticky' as const,
                                  top: 0,
                                  zIndex: 20,
                                  transition: resizingColumn === TASK_COLUMN_ID ? 'none' : 'background-color 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', position: 'relative', height: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '12px' }}>
                                      <Typography variant="body-semibold" color={carterColors['text-600']}>
                                        {taskColumnTitle}
                                      </Typography>
                                    </div>
                                  </div>
                                  {/* Task Column Resizer Handle - positioned on the border */}
                                  <div
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startResize(TASK_COLUMN_ID, e);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      right: '-6px',
                                      top: 0,
                                      bottom: 0,
                                      width: '12px',
                                      cursor: 'col-resize',
                                      backgroundColor: 'transparent',
                                      zIndex: 101,
                                      userSelect: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  onMouseEnter={(e) => {
                                    if (resizingColumn !== TASK_COLUMN_ID) {
                                      const line = e.currentTarget.querySelector('div') as HTMLElement;
                                      if (line) {
                                        line.style.width = '3px';
                                        line.style.backgroundColor = carterColors['brand-400'];
                                      }
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (resizingColumn !== TASK_COLUMN_ID) {
                                      const line = e.currentTarget.querySelector('div') as HTMLElement;
                                      if (line) {
                                        line.style.width = '2px';
                                        line.style.backgroundColor = carterColors['grey-300'];
                                      }
                                    }
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '2px',
                                      height: '100%',
                                      backgroundColor: resizingColumn === TASK_COLUMN_ID 
                                        ? carterColors['brand-600'] 
                                        : carterColors['grey-300'],
                                      transition: 'width 0.2s ease, background-color 0.2s ease',
                                    }}
                                  />
                                  </div>
                                </div>
                              </th>
                              {/* Dynamic Columns */}
                              {visibleColumns.map((column: MondayColumn) => (
                                <SortableColumnHeader key={column.id} column={column} />
                              ))}
                              {/* Add Column Button */}
                              <th
                                style={{
                                  minWidth: '120px',
                                  padding: '12px 16px',
                                  borderRight: `1px solid ${carterColors['grey-200']}`,
                                  borderBottom: `2px solid ${carterColors['grey-200']}`,
                                  backgroundColor: 'white',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  position: 'sticky' as const,
                                  top: 0,
                                  zIndex: 20,
                                  transition: 'background-color 0.2s ease',
                                }}
                                onClick={() => setShowAddColumnDialog(true)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <Plus size={16} color={carterColors['text-600']} />
                                  <Typography variant="body-regular" color={carterColors['text-600']}>
                                    Add Column
                                  </Typography>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className={styles.monday_group_section}>
                            {/* Items */}
                            {!isCollapsed && (
                              <>
                                {groupItems.map((item: MondayItem) => {
                                  const isSelected = selectedItems.has(item.id) || selectedItemId === item.id;
                                  return (
                                    <SortableRow
                                      key={item.id}
                                      item={item}
                                      groupId={group.id}
                                      isSelected={isSelected}
                                      onDelete={() => setShowDeleteItemConfirm(item.id)}
                                      onOpenDrawer={() => {
                                        setSelectedItemId(item.id);
                                        setDockOpen(true);
                                      }}
                                      expandedItems={expandedItems}
                                      toggleItemExpanded={toggleItemExpanded}
                                      handleItemClick={handleItemClick}
                                      checkboxColumnWidth={checkboxColumnWidth}
                                      handleCheckboxChange={handleCheckboxChange}
                                      taskColumnWidth={taskColumnWidth}
                                      resizingColumn={resizingColumn}
                                      TASK_COLUMN_ID={TASK_COLUMN_ID}
                                      editingItemName={editingItemName}
                                      itemNameInputRef={itemNameInputRef}
                                      setEditingItemName={setEditingItemName}
                                      mondayService={mondayService}
                                      boardId={boardId}
                                      mutateBoard={mutateBoard}
                                visibleColumns={visibleColumns}
                                columns={columns}
                                columnWidths={columnWidths}
                                      focusedCell={focusedCell}
                                      setFocusedCell={setFocusedCell}
                                      renderCell={renderCell}
                                      editingSubitemName={editingSubitemName}
                                      subitemNameInputRefs={subitemNameInputRefs}
                                      setEditingSubitemName={setEditingSubitemName}
                                      creatingSubitemFor={creatingSubitemFor}
                                      newSubitemName={newSubitemName}
                                      setCreatingSubitemFor={setCreatingSubitemFor}
                                      setNewSubitemName={setNewSubitemName}
                                    />
                                  );
                                })}
                              </>
                            )}

                            {/* Add Item Row */}
                            {!isCollapsed && (
                        <tr
                        style={{
                          backgroundColor: 'white',
                          borderLeft: activeCreatingGroupId === group.id ? `4px solid ${carterColors['brand-600']}` : 'none',
                          borderBottom: `1px solid ${carterColors['grey-200']}`,
                          transition: 'all 0.2s ease',
                        }}
                        >
                          {/* Checkbox placeholder */}
                          <td style={{ width: `${checkboxColumnWidth}px`, padding: '10px 8px' }} />
                          {/* Task name input */}
                          <td
                            style={{
                              width: `${taskColumnWidth}px`,
                              transition: resizingColumn === TASK_COLUMN_ID ? 'none' : undefined,
                              padding: '10px 16px',
                              borderRight: `1px solid ${carterColors['grey-200']}`,
                            }}
                          >
                            <input
                              type="text"
                              placeholder="+ Add item"
                              value={activeCreatingGroupId === group.id ? newItemName : ''}
                              onChange={(e) => {
                                setNewItemName(e.target.value);
                                if (!activeCreatingGroupId) {
                                  setActiveCreatingGroupId(group.id);
                                }
                              }}
                              onFocus={() => {
                                setActiveCreatingGroupId(group.id);
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && newItemName.trim()) {
                                  handleCreateItem(group.id);
                                } else if (e.key === 'Escape') {
                                  setNewItemName('');
                                  setActiveCreatingGroupId(null);
                                }
                              }}
                              style={{
                                width: '100%',
                                border: activeCreatingGroupId === group.id ? `2px solid ${carterColors['brand-600']}` : `1px solid ${carterColors['grey-300']}`,
                                borderRadius: '6px',
                                outline: 'none',
                                fontSize: '13px',
                                padding: '8px 12px',
                                color: activeCreatingGroupId === group.id ? carterColors['text-900'] : carterColors['text-500'],
                                background: 'white',
                                transition: 'all 0.2s ease',
                              }}
                            />
                          </td>
                          {/* Editable cells for columns */}
                          {visibleColumns.map((column: MondayColumn) => {
                            const width = columnWidths[column.id] || 150; // Use stored width or default to 150px
                            return (
                              <td
                                key={column.id}
                                style={{
                                  width: `${width}px`,
                                  padding: '8px',
                                  borderRight: `1px solid ${carterColors['grey-200']}`,
                                }}
                              >
                                {renderNewItemCell(column)}
                              </td>
                            );
                          })}
                          {/* Add Column placeholder */}
                          <td style={{ minWidth: '120px', padding: '8px' }} />
                            </tr>
                            )}

                            {/* Summary Row - Modern Design */}
                            {!isCollapsed && groupItems.length > 0 && (
                        <tr
                          style={{
                            backgroundColor: 'white',
                            borderTop: `2px solid ${carterColors['grey-200']}`,
                            borderBottom: `1px solid ${carterColors['grey-200']}`,
                          }}
                        >
                          {/* Checkbox placeholder */}
                          <td style={{ width: `${checkboxColumnWidth}px`, padding: '6px' }} />
                          {/* Task column - empty */}
                          <td
                            style={{
                              width: `${taskColumnWidth}px`,
                              transition: resizingColumn === TASK_COLUMN_ID ? 'none' : undefined,
                              padding: '6px 12px',
                              borderRight: `1px solid ${carterColors['grey-200']}`,
                            }}
                          />
                          {/* Summary cells for each column */}
                          {visibleColumns.map((column: MondayColumn) => {
                            const width = 150; // Fixed width for all columns
                            let summaryContent: React.ReactNode = null;

                            if (column.type === 'status') {
                              // Status distribution bar - use actual colors from status values
                              const statusCounts: Record<string, { count: number; color: string }> = {};
                              groupItems.forEach((item: MondayItem) => {
                                const statusValue = getColumnValue(item, column.id);
                                let statusLabel = (statusValue as any)?.label || statusValue?.text || 'Not Started';
                                
                                // If label is not directly available, try parsing the value
                                if (!statusLabel || statusLabel === 'Not Started') {
                                  if (statusValue?.value && typeof statusValue.value === 'string') {
                                    try {
                                      const parsed = JSON.parse(statusValue.value);
                                      if (parsed.label) {
                                        statusLabel = parsed.label;
                                      } else if (statusValue.text) {
                                        statusLabel = statusValue.text;
                                      }
                                    } catch {
                                      // Use text if available
                                      if (statusValue.text) {
                                        statusLabel = statusValue.text;
                                      }
                                    }
                                  }
                                }
                                
                                // Get the actual color from the status value
                                const statusColor = getStatusColorFromValue(statusValue, column);
                                
                                if (statusCounts[statusLabel]) {
                                  statusCounts[statusLabel].count += 1;
                                } else {
                                  statusCounts[statusLabel] = {
                                    count: 1,
                                    color: statusColor,
                                  };
                                }
                              });

                              const total = groupItems.length;
                              const segments = Object.entries(statusCounts).map(([label, data]) => ({
                                label,
                                count: data.count,
                                percentage: (data.count / total) * 100,
                                color: data.color, // Use actual color from status value
                              }));

                              summaryContent = (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '4px 0' }}>
                                  <div
                                    style={{
                                      flex: 1,
                                      height: '20px',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      overflow: 'hidden',
                                      backgroundColor: carterColors['grey-100'],
                                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                                    }}
                                  >
                                    {segments.map((seg, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          width: `${seg.percentage}%`,
                                          backgroundColor: seg.color,
                                          height: '100%',
                                          transition: 'width 0.3s ease',
                                          boxShadow: idx > 0 ? 'inset 1px 0 0 rgba(255,255,255,0.2)' : 'none',
                                        }}
                                        title={`${seg.label}: ${seg.count}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            } else if (column.type === 'timeline') {
                              // Timeline range summary
                              const dates: Date[] = [];
                              groupItems.forEach((item: MondayItem) => {
                                const timelineValue = getColumnValue(item, column.id);
                                let parsedValue: any = null;
                                
                                // Parse value if it's a JSON string
                                if (timelineValue?.value && typeof timelineValue.value === 'string') {
                                  try {
                                    parsedValue = JSON.parse(timelineValue.value);
                                  } catch {
                                    // If parsing fails, use the value object directly
                                    parsedValue = timelineValue;
                                  }
                                } else {
                                  parsedValue = timelineValue;
                                }
                                
                                if (parsedValue?.from) dates.push(new Date(parsedValue.from));
                                if (parsedValue?.to) dates.push(new Date(parsedValue.to));
                              });

                              if (dates.length > 0) {
                                try {
                                  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                                  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                                  const startStr = minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  const endStr = maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                summaryContent = (
                                  <div
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: '3px',
                                      backgroundColor: '#579bfc',
                                      display: 'inline-block',
                                    }}
                                  >
                                    <div style={{ fontSize: '10px', fontWeight: 600 }}>
                                      <Typography variant="body-regular" color="white">
                                        {startStr} - {endStr}
                                      </Typography>
                                    </div>
                                  </div>
                                );
                                } catch {
                                  // If date parsing fails, don't show summary
                                }
                              }
                            } else if (column.type === 'numeric' || column.type === 'numbers') {
                              // Budget/number sum
                              let sum = 0;
                              groupItems.forEach((item: MondayItem) => {
                                const numValue = getColumnValue(item, column.id);
                                if (numValue?.text) {
                                  const parsed = parseFloat(numValue.text.replace(/[^0-9.-]/g, ''));
                                  if (!isNaN(parsed)) sum += parsed;
                                }
                              });

                              if (sum > 0) {
                                summaryContent = (
                                  <div style={{ fontSize: '11px', fontWeight: 600 }}>
                                    <Typography variant="body-regular" color={carterColors['text-600']}>
                                      {sum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} sum
                                    </Typography>
                                  </div>
                                );
                              }
                            }

                            return (
                              <td
                                key={column.id}
                                style={{
                                  width: `${width}px`,
                                  padding: '6px 8px',
                                  borderRight: `1px solid ${carterColors['grey-200']}`,
                                  verticalAlign: 'middle',
                                }}
                              >
                                {summaryContent || <div style={{ fontSize: '11px', color: carterColors['text-400'] }}>-</div>}
                              </td>
                            );
                          })}
                          {/* Add Column placeholder */}
                          <td style={{ minWidth: '120px', padding: '6px' }} />
                        </tr>
                      )}
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* New Group Input */}
              {isCreatingGroup && (
                <div
                  style={{
                    marginBottom: '32px',
                    width: 'max-content',
                    minWidth: '100%',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: carterColors['grey-200'],
                      borderLeft: `4px solid ${carterColors['brand-600']}`,
                      borderTop: `1px solid ${carterColors['grey-300']}`,
                      borderBottom: `1px solid ${carterColors['grey-300']}`,
                      borderRight: `1px solid ${carterColors['grey-300']}`,
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderRadius: '8px 8px 0 0',
                      width: 'max-content',
                      minWidth: '100%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Enter group name..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newGroupName.trim()) {
                          handleCreateGroup();
                        } else if (e.key === 'Escape') {
                          setIsCreatingGroup(false);
                          setNewGroupName('');
                        }
                      }}
                      autoFocus
                      style={{
                        flex: 1,
                        border: `2px solid ${carterColors['brand-600']}`,
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        outline: 'none',
                        minWidth: '200px',
                      }}
                    />
                    <Button
                      variant="primary"
                      size="small"
                      label="Create"
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim()}
                    />
                    <Button
                      variant="tertiary"
                      size="small"
                      icon={<X size={16} />}
                      onClick={() => {
                        setIsCreatingGroup(false);
                        setNewGroupName('');
                      }}
                    />
                  </div>
                </div>
              )}

            {/* Delete Confirmation Dialogs */}
            {showDeleteGroupConfirm && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                }}
                onClick={() => setShowDeleteGroupConfirm(null)}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    maxWidth: '400px',
                    width: '90%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Typography variant="h3-semibold" color={carterColors['text-900']}>
                      Delete Group?
                    </Typography>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <Typography variant="body-regular" color={carterColors['text-600']}>
                      This will delete the group and all items in it. This action cannot be undone.
                    </Typography>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button
                      variant="secondary"
                      size="medium"
                      label="Cancel"
                      onClick={() => setShowDeleteGroupConfirm(null)}
                    />
                    <Button
                      variant="primary"
                      size="medium"
                      label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(showDeleteGroupConfirm);
                      }}
                      style={{ backgroundColor: carterColors['red-700'] }}
                    />
                  </div>
                </div>
              </div>
            )}

            {showDeleteItemConfirm && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                }}
                onClick={() => setShowDeleteItemConfirm(null)}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    maxWidth: '400px',
                    width: '90%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Typography variant="h3-semibold" color={carterColors['text-900']}>
                      Delete Item?
                    </Typography>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <Typography variant="body-regular" color={carterColors['text-600']}>
                      This action cannot be undone.
                    </Typography>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button
                      variant="secondary"
                      size="medium"
                      label="Cancel"
                      onClick={() => setShowDeleteItemConfirm(null)}
                    />
                    <Button
                      variant="primary"
                      size="medium"
                      label="Delete"
                      onClick={() => handleDeleteItem(showDeleteItemConfirm)}
                      style={{ backgroundColor: carterColors['red-700'] }}
                    />
                  </div>
                </div>
              </div>
            )}

            {showDeleteColumnConfirm && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                }}
                onClick={() => setShowDeleteColumnConfirm(null)}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    maxWidth: '400px',
                    width: '90%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Typography variant="h3-semibold" color={carterColors['text-900']}>
                      Delete Column?
                    </Typography>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <Typography variant="body-regular" color={carterColors['text-600']}>
                      This will delete the column and all values in it. This action cannot be undone.
                    </Typography>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button
                      variant="secondary"
                      size="medium"
                      label="Cancel"
                      onClick={() => setShowDeleteColumnConfirm(null)}
                    />
                    <Button
                      variant="primary"
                      size="medium"
                      label="Delete"
                      onClick={() => handleDeleteColumn(showDeleteColumnConfirm)}
                      style={{ backgroundColor: carterColors['red-700'] }}
                    />
                  </div>
                </div>
              </div>
            )}
            </div>

          {/* Selection Dock - Bottom (when items are selected) */}
          {selectedItems.size > 0 && !dockOpen && (
            <SelectionDock
              selectedCount={selectedItems.size}
              selectedItemIds={Array.from(selectedItems)}
              boardId={boardId}
              onMoveToGroup={() => {
                setMoveToGroupIsBulk(true);
                setMoveToGroupSelectedId(null);
                setMoveToGroupSearchQuery('');
                setShowMoveToGroupDialog(true);
              }}
              onDelete={handleBulkDelete}
              onClear={() => setSelectedItems(new Set())}
              onDuplicate={async () => {
                try {
                  const duplicatePromises = Array.from(selectedItems).map(itemId =>
                    mondayService.duplicateItem(boardId, itemId)
                  );
                  await Promise.all(duplicatePromises);
                  mutateBoard();
                  setSelectedItems(new Set());
                } catch (error: any) {
                  showAlert({
                    variant: 'error' as any,
                    title: error?.message || 'Duplicate items failed',
                  });
                }
              }}
              onExport={() => {
                const selectedItemsData = allItems.filter((item: MondayItem) => selectedItems.has(item.id));
                if (selectedItemsData.length === 0) return;

                // Build headers: Name, Group, then all column titles
                const headers = [
                  'Name',
                  'Group',
                  ...columns.map((col: MondayColumn) => col.title || col.id)
                ];

                // Build rows with all column values
                const rows = selectedItemsData.map((item: MondayItem) => {
                  const row = [
                    item.name || '',
                    item.group?.title || '',
                  ];

                  // Add value for each column
                  columns.forEach((col: MondayColumn) => {
                    const columnValue = getColumnValue(item, col.id);
                    // Use text if available, otherwise try to parse value or use empty string
                    let cellValue = '';
                    if (columnValue) {
                      if (columnValue.text !== undefined && columnValue.text !== null) {
                        cellValue = String(columnValue.text);
                      } else if (columnValue.value !== undefined && columnValue.value !== null) {
                        // Try to parse JSON value if it's a string
                        if (typeof columnValue.value === 'string') {
                          try {
                            const parsed = JSON.parse(columnValue.value);
                            // For status columns, try to get label
                            if (parsed.label) {
                              cellValue = String(parsed.label);
                            } else if (parsed.text) {
                              cellValue = String(parsed.text);
                            } else {
                              cellValue = String(columnValue.value);
                            }
                          } catch {
                            cellValue = String(columnValue.value);
                          }
                        } else {
                          cellValue = String(columnValue.value);
                        }
                      }
                    }
                    row.push(cellValue);
                  });

                  return row;
                });

                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `monday-items-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              onArchive={async () => {
                try {
                  const archivePromises = Array.from(selectedItems).map(itemId =>
                    mondayService.archiveItem(itemId)
                  );
                  await Promise.all(archivePromises);
                  mutateBoard();
                  setSelectedItems(new Set());
                } catch (error: any) {
                  showAlert({
                    variant: 'error' as any,
                    title: error?.message || 'Archive items failed',
                  });
                }
              }}
              onUpdate={mutateBoard}
            />
          )}

          {/* Item Details Drawer - Right Side */}
          {dockOpen && selectedItemId && (
            <ItemDetailsDock
              itemId={selectedItemId}
              boardId={boardId}
              onClose={handleCloseDock}
              onUpdate={mutateBoard}
              groups={groups}
              onMoveToGroup={async (groupId: string) => {
                try {
                  await mondayService.moveItem(selectedItemId, groupId);
                  mutateBoard();
                } catch (error: any) {
                  showAlert({
                    variant: 'error' as any,
                    title: error?.message || 'Move item failed',
                  });
                }
              }}
              onOpenMoveDialog={() => {
                setMoveToGroupIsBulk(false);
                setMoveToGroupSelectedId(null);
                setMoveToGroupSearchQuery('');
                setShowMoveToGroupDialog(true);
              }}
              renderCell={renderCell}
              columns={columns}
              getColumnValue={getColumnValue}
            />
          )}
        </div>

      {/* Add Column Dialog */}
      {showAddColumnDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowAddColumnDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Add Column
              </Typography>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { type: 'text', label: 'Text', description: 'Single-line text input' },
                { type: 'status', label: 'Status', description: 'Dropdown with colored labels' },
                { type: 'people', label: 'People', description: 'Select one or more users' },
                { type: 'date', label: 'Date', description: 'Date picker' },
                { type: 'numeric', label: 'Number', description: 'Numeric input' },
                { type: 'checkbox', label: 'Checkbox', description: 'True/false toggle' },
                { type: 'tags', label: 'Tags', description: 'Multiple tags' },
              ].map((colType) => (
                <div
                  key={colType.type}
                  style={{
                    padding: '12px',
                    border: `1px solid ${carterColors['grey-200']}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                    e.currentTarget.style.borderColor = carterColors['brand-600'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = carterColors['grey-200'];
                  }}
                  onClick={async () => {
                    try {
                      await mondayService.createColumn(boardId, `New ${colType.label}`, colType.type);
                      setShowAddColumnDialog(false);
                      mutateBoard();
                    } catch (error: any) {
                      showAlert({
                        variant: 'error' as any,
                        title: error?.message || 'Create column failed',
                      });
                    }
                  }}
                >
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {colType.label}
                  </Typography>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    {colType.description}
                  </Typography>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="medium"
                label="Cancel"
                onClick={() => setShowAddColumnDialog(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Column Settings Modal */}
      {showColumnSettings && (() => {
        const column = columns.find(c => c.id === showColumnSettings);
        if (!column) return null;
        
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={() => {
              setShowColumnSettings(null);
              setEditingColumnName('');
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '24px' }}>
                <Typography variant="h3-semibold" color={carterColors['text-900']}>
                  Column Settings
                </Typography>
              </div>
              
              {/* Column Name Editor */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    Column Name
                  </Typography>
                </div>
                <input
                  type="text"
                  value={editingColumnName || column.title}
                  onChange={(e) => setEditingColumnName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && editingColumnName.trim() && editingColumnName !== column.title) {
                      handleUpdateColumnName(column.id, editingColumnName.trim());
                    } else if (e.key === 'Escape') {
                      setEditingColumnName('');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${carterColors['grey-300']}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  placeholder="Enter column name..."
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px' }}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    Column Type: <strong>{column.type}</strong>
                  </Typography>
                </div>
              </div>
              
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  size="medium"
                  label="Cancel"
                  onClick={() => {
                    setShowColumnSettings(null);
                    setEditingColumnName('');
                  }}
                />
                <Button
                  variant="primary"
                  size="medium"
                  label="Save"
                  onClick={() => {
                    if (editingColumnName.trim() && editingColumnName !== column.title) {
                      handleUpdateColumnName(column.id, editingColumnName.trim());
                    } else {
                      setShowColumnSettings(null);
                      setEditingColumnName('');
                    }
                  }}
                  disabled={!editingColumnName.trim() || editingColumnName === column.title}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Group By Dialog */}
      {showGroupByDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setShowGroupByDialog(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Group by Column
              </Typography>
            </div>
            <div style={{ marginBottom: '20px', fontSize: '13px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                Select a column to group items by its values
              </Typography>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              <button
                onClick={() => {
                  handleGroupByChange(null);
                  setShowGroupByDialog(false);
                }}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${!groupByColumnId ? carterColors['brand-600'] : carterColors['grey-200']}`,
                  borderRadius: '8px',
                  backgroundColor: !groupByColumnId ? carterColors['brand-100'] : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  None (Original groups)
                </Typography>
              </button>
              {visibleColumns.map((column: MondayColumn) => {
                const isSelected = groupByColumnId === column.id;
                return (
                  <button
                    key={column.id}
                    onClick={() => {
                      handleGroupByChange(column.id);
                      setShowGroupByDialog(false);
                    }}
                    style={{
                      padding: '12px 16px',
                      border: `2px solid ${isSelected ? carterColors['brand-600'] : carterColors['grey-200']}`,
                      borderRadius: '8px',
                      backgroundColor: isSelected ? carterColors['brand-100'] : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = carterColors['grey-300'];
                        e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = carterColors['grey-200'];
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        {column.title}
                      </Typography>
                      <div style={{ fontSize: '11px' }}>
                        <Typography variant="caption-regular" color={carterColors['text-500']}>
                          ({column.type})
                        </Typography>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="tertiary"
                size="small"
                label="Cancel"
                onClick={() => {
                  setShowGroupByDialog(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Move to Group Dialog */}
      {(showBulkMoveDialog || showMoveToGroupDialog) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setShowBulkMoveDialog(false);
            setShowMoveToGroupDialog(false);
            setBulkMoveTargetGroup(null);
            setMoveToGroupSelectedId(null);
            setMoveToGroupSearchQuery('');
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '0',
              minWidth: '400px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: `1px solid ${carterColors['grey-200']}`
            }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                {moveToGroupIsBulk && selectedItems.size > 0 
                  ? `Move ${selectedItems.size} item(s) to group`
                  : 'Choose group'}
              </Typography>
              <button
                onClick={() => {
                  setShowBulkMoveDialog(false);
                  setShowMoveToGroupDialog(false);
                  setBulkMoveTargetGroup(null);
                  setMoveToGroupSelectedId(null);
                  setMoveToGroupSearchQuery('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: carterColors['text-600'],
                  fontSize: '14px',
                  padding: '4px 8px',
                }}
              >
                Back
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '16px 24px', position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '36px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: carterColors['text-400'],
                  zIndex: 1,
                }}
              />
              <input
                type="text"
                placeholder="Search group"
                value={moveToGroupSearchQuery}
                onChange={(e) => setMoveToGroupSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: `1px solid ${carterColors['brand-600']}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                autoFocus
              />
            </div>

            {/* Groups List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: '0 24px 24px 24px',
              maxHeight: '400px',
            }}>
              {/* New Group Option */}
              <button
                onClick={() => {
                  const newGroupId = 'new-group';
                  setMoveToGroupSelectedId(newGroupId);
                  setBulkMoveTargetGroup(newGroupId);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${(moveToGroupSelectedId === 'new-group' || 
                    bulkMoveTargetGroup === 'new-group') ? carterColors['brand-600'] : carterColors['grey-200']}`,
                  borderRadius: '8px',
                  backgroundColor: (moveToGroupSelectedId === 'new-group' || 
                    bulkMoveTargetGroup === 'new-group') ? carterColors['brand-100'] : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                }}
                onMouseEnter={(e) => {
                  if (moveToGroupSelectedId !== 'new-group' && bulkMoveTargetGroup !== 'new-group') {
                    e.currentTarget.style.borderColor = carterColors['grey-300'];
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                  }
                }}
                onMouseLeave={(e) => {
                  if (moveToGroupSelectedId !== 'new-group' && bulkMoveTargetGroup !== 'new-group') {
                    e.currentTarget.style.borderColor = carterColors['grey-200'];
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: carterColors['brand-600'],
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  New Group
                </Typography>
              </button>

              {/* Existing Groups */}
              {groups
                .filter((group: MondayGroup) => 
                  !moveToGroupSearchQuery || 
                  group.title.toLowerCase().includes(moveToGroupSearchQuery.toLowerCase())
                )
                .map((group: MondayGroup) => {
                  const isSelected = moveToGroupSelectedId === group.id || bulkMoveTargetGroup === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setMoveToGroupSelectedId(group.id);
                        setBulkMoveTargetGroup(group.id);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${isSelected ? carterColors['brand-600'] : carterColors['grey-200']}`,
                        borderRadius: '8px',
                        backgroundColor: isSelected ? carterColors['brand-100'] : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = carterColors['grey-300'];
                          e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = carterColors['grey-200'];
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: group.color || DEFAULT_GROUP_COLOR,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        {group.title}
                      </Typography>
                    </button>
                  );
                })}
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              padding: '16px 24px',
              borderTop: `1px solid ${carterColors['grey-200']}`,
            }}>
              <Button
                variant="tertiary"
                size="small"
                label="Cancel"
                onClick={() => {
                  setShowBulkMoveDialog(false);
                  setShowMoveToGroupDialog(false);
                  setBulkMoveTargetGroup(null);
                  setMoveToGroupSelectedId(null);
                  setMoveToGroupSearchQuery('');
                }}
              />
              <Button
                variant="primary"
                size="small"
                label="Move"
                onClick={async () => {
                  const targetGroupId = moveToGroupSelectedId || bulkMoveTargetGroup;
                  if (targetGroupId === 'new-group') {
                    // Close dialog and show group creation input
                    setShowBulkMoveDialog(false);
                    setShowMoveToGroupDialog(false);
                    setBulkMoveTargetGroup(null);
                    setMoveToGroupSelectedId(null);
                    setMoveToGroupSearchQuery('');
                    setIsCreatingGroup(true);
                  } else if (targetGroupId) {
                    try {
                      if (moveToGroupIsBulk && selectedItems.size > 0) {
                        // Bulk move
                        await handleBulkMove(targetGroupId);
                      } else if (selectedItemId) {
                        // Single item move
                        await mondayService.moveItem(selectedItemId, targetGroupId);
                        mutateBoard();
                      }
                      setShowBulkMoveDialog(false);
                      setShowMoveToGroupDialog(false);
                      setBulkMoveTargetGroup(null);
                      setMoveToGroupSelectedId(null);
                      setMoveToGroupSearchQuery('');
                    } catch (error: any) {
                      showAlert({
                        variant: 'error' as any,
                        title: error?.message || 'Move item failed',
                      });
                    }
                  }
                }}
                disabled={(!moveToGroupSelectedId && !bulkMoveTargetGroup)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save View Dialog */}
      {showSaveViewDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setShowSaveViewDialog(false);
            setNewViewName('');
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Save View
              </Typography>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Enter view name..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveView();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${carterColors['grey-300']}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="tertiary"
                size="small"
                label="Cancel"
                onClick={() => {
                  setShowSaveViewDialog(false);
                  setNewViewName('');
                }}
              />
              <Button
                variant="primary"
                size="small"
                label="Save"
                onClick={handleSaveView}
                disabled={!newViewName.trim()}
              />
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

// Item Details Sidebar Component
const ItemDetailsDock: React.FC<{
  itemId: string;
  boardId: string;
  onClose: () => void;
  onUpdate: () => void;
  groups: MondayGroup[];
  onMoveToGroup: (groupId: string) => void;
  onOpenMoveDialog?: () => void;
  renderCell: (item: MondayItem, column: MondayColumn) => React.ReactNode;
  columns: MondayColumn[];
  getColumnValue: (item: MondayItem, columnId: string) => any;
}> = ({ itemId, boardId, onClose, onUpdate, onOpenMoveDialog, renderCell, columns, getColumnValue }) => {
  const mondayService = useMemo(() => new MondayService(), []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [drawerWidth, setDrawerWidth] = useState(800);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(800);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  // Fetch item using custom hook
  const { item, error: itemError } = useMondayItem(itemId);

  // Toggle column expansion
  const toggleColumnExpansion = useCallback((columnId: string) => {
    setExpandedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  }, []);

  // Column types that have dedicated cell renderers (supported in drawer)
  const DRAWER_SUPPORTED_COLUMN_TYPES = useMemo(
    () => new Set(['status', 'date', 'people', 'numeric', 'numbers', 'file', 'timeline', 'checkbox', 'tags', 'priority', 'last_updated']),
    []
  );

  // Render cell for drawer with "Show more" functionality for text columns
  const renderDrawerCell = useCallback((item: MondayItem, column: MondayColumn) => {
    if (!item) return null;
    
    const columnValue = getColumnValue(item, column.id);
    const isExpanded = expandedColumns.has(column.id);

    // Non-supported data: show -- (e.g. raw objects that would display as [object Object])
    const isUnsupportedValue =
      columnValue === null ||
      columnValue === undefined ||
      (typeof columnValue === 'object' && !DRAWER_SUPPORTED_COLUMN_TYPES.has(column.type));
    if (isUnsupportedValue) {
      return (
        <Typography variant="body-regular" color={carterColors['text-600']}>
          --
        </Typography>
      );
    }
    
    // For text columns, render with "Show more" functionality
    if (column.type === 'text' || column.type === 'long_text') {
      const textValue = columnValue?.text || columnValue?.value || columnValue || '';
      let displayText = typeof textValue === 'string' ? textValue : String(textValue);
      if (displayText === '[object Object]' || (typeof textValue === 'object' && textValue !== null)) {
        displayText = '--';
      }
      
      // Check if text is long enough to need truncation (more than 4 lines or 200 chars)
      const lineCount = displayText.split('\n').length;
      const isLongText = displayText.length > 200 || lineCount > 4;
      
      if (!isLongText || isExpanded) {
        // Show full text
        return (
          <div style={{ width: '100%' }}>
            <div
              style={{
                fontSize: '12px',
                lineHeight: '18px',
                color: carterColors['text-900'],
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxWidth: '100%',
              }}
            >
              <Typography variant="body-regular" color={carterColors['text-900']}>
                {displayText || '-'}
              </Typography>
            </div>
            {isLongText && isExpanded && (
              <Button
                variant="tertiary"
                size="small"
                label="Show less"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleColumnExpansion(column.id);
                }}
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  padding: '4px 8px',
                }}
              />
            )}
          </div>
        );
      } else {
        // Show truncated text with "Show more" button (4 lines max)
        return (
          <div style={{ width: '100%' }}>
            <div
              style={{
                fontSize: '12px',
                lineHeight: '18px',
                color: carterColors['text-900'],
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxWidth: '100%',
                maxHeight: '72px', // ~4 lines (18px * 4)
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
              }}
            >
              <Typography variant="body-regular" color={carterColors['text-900']}>
                {displayText}
              </Typography>
            </div>
            <Button
              variant="tertiary"
              size="small"
              label="Show more"
              onClick={(e) => {
                e.stopPropagation();
                toggleColumnExpansion(column.id);
              }}
              style={{
                marginTop: '8px',
                fontSize: '11px',
                padding: '4px 8px',
              }}
            />
          </div>
        );
      }
    }
    
    // For other column types, use the regular renderCell
    return renderCell(item, column);
  }, [expandedColumns, getColumnValue, renderCell, toggleColumnExpansion, DRAWER_SUPPORTED_COLUMN_TYPES]);

  // Resize handlers for drawer
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(drawerWidth);
  }, [drawerWidth]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const diff = resizeStartX - e.clientX; // Negative because we're resizing from right edge
    const newWidth = Math.min(1200, Math.max(400, resizeStartWidth + diff));
    setDrawerWidth(newWidth);
  }, [isResizing, resizeStartX, resizeStartWidth]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResize, stopResize]);

  const handleDelete = async () => {
    try {
      await mondayService.deleteItem(itemId);
      onUpdate();
      onClose();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Delete item failed',
      });
    }
  };

  if (!item) {
    return null;
  }

  if (itemError) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          backgroundColor: 'white',
          borderLeft: `1px solid ${carterColors['grey-200']}`,
          boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <Typography variant="body-regular" color={carterColors['text-600']}>
          Failed to load item details
        </Typography>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
        }}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: `${drawerWidth}px`,
          backgroundColor: 'white',
          borderLeft: `1px solid ${carterColors['grey-200']}`,
          boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          transition: isResizing ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResize}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'ew-resize',
            zIndex: 1001,
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['brand-600'];
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${carterColors['grey-200']}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
            <div style={{ marginBottom: '4px', overflow: 'hidden' }}>
              <TruncatedText
                text={item.name}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  display: 'block',
                }}
              >
                <Typography variant="h3-semibold" color={carterColors['text-900']}>
                  {item.name}
                </Typography>
              </TruncatedText>
            </div>
            {item.group && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', minWidth: 0, maxWidth: '100%' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    backgroundColor: item.group.color || DEFAULT_GROUP_COLOR,
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: '12px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                  <TruncatedText
                    text={item.group.title}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      display: 'block',
                    }}
                  >
                    <Typography variant="caption-regular" color={carterColors['text-500']}>
                      {item.group.title}
                    </Typography>
                  </TruncatedText>
                </div>
              </div>
            )}
          </div>
          <Button variant="tertiary" size="small" icon={<X size={18} />} onClick={onClose} />
        </div>

        {/* Tabs */}
        <div
          style={{
            borderBottom: `1px solid ${carterColors['grey-200']}`,
            display: 'flex',
            padding: '0 24px',
            gap: '24px',
          }}
        >
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'details' ? `2px solid ${carterColors['brand-600']}` : '2px solid transparent',
              color: activeTab === 'details' ? carterColors['brand-600'] : carterColors['text-600'],
              fontSize: '14px',
              fontWeight: activeTab === 'details' ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              padding: '12px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'files' ? `2px solid ${carterColors['brand-600']}` : '2px solid transparent',
              color: activeTab === 'files' ? carterColors['brand-600'] : carterColors['text-600'],
              fontSize: '14px',
              fontWeight: activeTab === 'files' ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            Files
          </button>
        </div>

        {/* Drawer Content - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Tab Content */}
          {activeTab === 'details' && (
            <>
              {/* Actions Section */}
              <div style={{ 
                marginBottom: '20px', 
                display: 'flex', 
                gap: '8px', 
                flexWrap: 'wrap',
              }}>
                <Button
                  variant="secondary"
                  size="small"
                  label="Move to Group"
                  icon={<ChevronRight size={12} />}
                  onClick={() => {
                    if (onOpenMoveDialog) {
                      onOpenMoveDialog();
                    }
                  }}
                  style={{
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    height: '32px',
                  }}
                />
                <Button
                  variant="secondary"
                  size="small"
                  label="Duplicate"
                  icon={<Copy size={12} />}
                  onClick={async () => {
                    try {
                      await mondayService.duplicateItem(boardId, itemId);
                      onUpdate();
                    } catch (error: any) {
                      showAlert({
                        variant: 'error' as any,
                        title: error?.message || 'Duplicate item failed',
                      });
                    }
                  }}
                  style={{
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    height: '32px',
                  }}
                />
                <Button
                  variant="secondary"
                  size="small"
                  label="Delete"
                  icon={<Trash2 size={12} />}
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ 
                    color: carterColors['red-700'],
                    borderColor: carterColors['red-700'],
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    height: '32px',
                  }}
                />
              </div>

              {/* Column Values Section - Compact Grid */}
              {columns && columns.length > 0 && (
                <div>
                  <div style={{ 
                    marginBottom: '12px',
                  }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Details
                    </Typography>
                  </div>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '10px',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}>
                    {columns
                      .filter((col: MondayColumn) => col.type !== 'name')
                      .map((column: MondayColumn) => {
                        return (
                          <div
                            key={column.id}
                            style={{
                              padding: '12px',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: `1px solid ${carterColors['grey-200']}`,
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              minWidth: 0,
                              maxWidth: '100%',
                              overflow: 'hidden',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = carterColors['grey-300'];
                              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = carterColors['grey-200'];
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <TruncatedText
                              text={column.title}
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: carterColors['text-600'],
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                              }}
                            >
                              {column.title}
                            </TruncatedText>
                            <div style={{ 
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              minWidth: 0,
                              maxWidth: '100%',
                              overflow: 'visible',
                              width: '100%',
                            }}>
                              {item && renderDrawerCell(item, column)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'files' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <Typography variant="body-semibold" color={carterColors['text-900']}>
                  Files
                </Typography>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Typography variant="body-regular" color={carterColors['text-500']}>
                  Files feature coming soon
                </Typography>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Delete Item
              </Typography>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                Are you sure you want to delete "{item.name}"? This action cannot be undone.
              </Typography>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="tertiary"
                size="small"
                label="Cancel"
                onClick={() => setShowDeleteConfirm(false)}
              />
              <Button
                variant="primary"
                size="small"
                label="Delete"
                onClick={() => {
                  handleDelete();
                  setShowDeleteConfirm(false);
                }}
                style={{ backgroundColor: carterColors['red-700'], borderColor: carterColors['red-700'] }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SelectionDock: React.FC<{
  selectedCount: number;
  selectedItemIds: string[];
  boardId: string;
  onMoveToGroup: () => void;
  onDelete: () => void;
  onClear: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onArchive: () => void;
  onUpdate: () => void;
}> = ({ selectedCount, onMoveToGroup, onDelete, onClear, onDuplicate, onExport, onArchive }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: isVisible 
            ? 'translateX(-50%) translateY(0) scale(1)' 
            : 'translateX(-50%) translateY(100px) scale(0.95)',
          opacity: isVisible ? 1 : 0,
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: isVisible 
            ? '0 8px 24px rgba(0,0,0,0.2)' 
            : '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          border: `1px solid ${carterColors['grey-200']}`,
          minWidth: '600px',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
            'opacity 0.3s ease-out, box-shadow 0.4s ease-out',
          willChange: 'transform, opacity',
        }}
      >
      {/* Selection Count Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingRight: '16px',
          borderRight: `1px solid ${carterColors['grey-200']}`,
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: carterColors['brand-600'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {selectedCount}
        </div>
        <div style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
          <Typography variant="body-semibold" color={carterColors['text-900']}>
            {selectedCount === 1 ? 'Task' : 'Tasks'} selected
          </Typography>
        </div>
      </div>

      {/* Action Icons with Labels */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, justifyContent: 'center' }}>
        {/* Duplicate */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1) translateY(0)',
          }}
          onClick={onDuplicate}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) icon.style.transform = 'scale(1.15)';
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) icon.style.transform = 'scale(1)';
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(0)';
          }}
        >
          <Copy 
            size={18} 
            color={carterColors['text-600']}
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }} 
          />
          <div style={{ 
            fontSize: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
          }}>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Duplicate
            </Typography>
          </div>
        </div>

        {/* Export */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1) translateY(0)',
          }}
          onClick={onExport}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) icon.style.transform = 'scale(1.15)';
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) icon.style.transform = 'scale(1)';
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(0)';
          }}
        >
          <Upload 
            size={18} 
            color={carterColors['text-600']}
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }} 
          />
          <div style={{ 
            fontSize: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
          }}>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Export
            </Typography>
          </div>
        </div>

        {/* Archive */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1) translateY(0)',
          }}
          onClick={onArchive}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) icon.style.transform = 'scale(1.15)';
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) icon.style.transform = 'scale(1)';
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(0)';
          }}
        >
          <Archive 
            size={18} 
            color={carterColors['text-600']}
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }} 
          />
          <div style={{ 
            fontSize: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
          }}>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Archive
            </Typography>
          </div>
        </div>

        {/* Delete */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1) translateY(0)',
          }}
          onClick={() => setShowDeleteModal(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['red-200'];
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) {
              icon.style.transform = 'scale(1.15) rotate(5deg)';
              icon.style.color = carterColors['red-700'];
            }
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) {
              icon.style.transform = 'scale(1) rotate(0deg)';
              icon.style.color = carterColors['red-700'];
            }
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(0)';
          }}
        >
          <Trash2 
            size={18} 
            color={carterColors['red-700']}
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }} 
          />
          <div style={{ 
            fontSize: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
          }}>
            <Typography variant="caption-regular" color={carterColors['red-700']}>
              Delete
            </Typography>
          </div>
        </div>

        {/* Move to */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1) translateY(0)',
          }}
          onClick={onMoveToGroup}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) {
              icon.style.transform = 'scale(1.15) translateX(2px)';
            }
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) {
              icon.style.transform = 'scale(1) translateX(0)';
            }
            const label = e.currentTarget.querySelector('div:last-child') as HTMLElement;
            if (label) label.style.transform = 'translateY(0)';
          }}
        >
          <ArrowRight 
            size={18} 
            color={carterColors['text-600']}
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }} 
          />
          <div style={{ 
            fontSize: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
          }}>
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              Move to
            </Typography>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '16px',
          borderLeft: `1px solid ${carterColors['grey-200']}`,
        }}
      >
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1) rotate(0deg)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = carterColors['grey-100'];
            e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) {
              icon.style.transform = 'scale(1.1)';
              icon.style.color = carterColors['text-900'];
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
            if (icon) {
              icon.style.transform = 'scale(1)';
              icon.style.color = carterColors['text-600'];
            }
          }}
        >
          <X 
            size={18} 
            color={carterColors['text-600']}
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }} 
          />
        </button>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
                Delete {selectedCount} {selectedCount === 1 ? 'item' : 'items'}?
              </Typography>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                This action cannot be undone. The selected item(s) will be permanently deleted.
              </Typography>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="tertiary"
                size="small"
                label="Cancel"
                onClick={() => setShowDeleteModal(false)}
              />
              <Button
                variant="primary"
                size="small"
                label="Delete"
                onClick={() => {
                  onDelete();
                  setShowDeleteModal(false);
                }}
                style={{ backgroundColor: carterColors['red-700'], borderColor: carterColors['red-700'] }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MondayBoardView;
