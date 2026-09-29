import React, { useState } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { ChevronDown } from 'lucide-react';
import { Skeleton } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface PriorityCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  settings?: string;
  onUpdate?: () => void;
}

// Priority color mapping
const getPriorityColor = (priorityLabel: string): string => {
  const labelLower = priorityLabel.trim().toLowerCase();
  
  // Critical/Urgent priorities - Red
  if (labelLower.includes('critical') || labelLower.includes('urgent') || labelLower === 'critical' || labelLower === 'urgent') {
    return '#e2445c'; // Red
  }
  // High priority - Orange/Red
  else if (labelLower.includes('high') || labelLower === 'high') {
    return '#fdab3d'; // Orange
  }
  // Medium priority - Yellow
  else if (labelLower.includes('medium') || labelLower === 'medium' || labelLower === 'normal') {
    return '#f5ca00'; // Yellow
  }
  // Low priority - Green/Blue
  else if (labelLower.includes('low') || labelLower === 'low') {
    return '#00c875'; // Green
  }
  // Default - Light grey
  else {
    return '#c4c4c4'; // Light grey
  }
};

const PriorityCell: React.FC<PriorityCellProps> = ({ value, itemId, columnId, boardId, settings, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mondayService = React.useMemo(() => new MondayService(), []);

  // Parse settings to get priority options
  let originalPriorityOptions: Array<{ label: string; color: string; index: number }> = [];
  let priorityOptions: Array<{ label: string; color: string; index: number }> = [];
  
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      const labels = parsed.labels || {};

      // Parse indices correctly - Monday.com uses the keys as indices
      originalPriorityOptions = Object.entries(labels).map(([indexStr, label]: [string, any]) => {
        const index = parseInt(indexStr, 10);
        
        // Get color from settings, or infer from label if not provided
        let color = parsed.colors?.[indexStr];
        if (!color || color === '#808080') {
          color = getPriorityColor(String(label));
        }
        
        return {
          label: String(label).trim(),
          color: color,
          index: index,
        };
      });
      priorityOptions = [...originalPriorityOptions];
    } catch {
      // Default priorities if parsing fails
      originalPriorityOptions = [
        { label: 'Critical', color: '#e2445c', index: 0 },
        { label: 'High', color: '#fdab3d', index: 1 },
        { label: 'Medium', color: '#f5ca00', index: 2 },
        { label: 'Low', color: '#00c875', index: 3 },
      ];
      priorityOptions = [...originalPriorityOptions];
    }
  } else {
    // Default priorities
    originalPriorityOptions = [
      { label: 'Critical', color: '#e2445c', index: 0 },
      { label: 'High', color: '#fdab3d', index: 1 },
      { label: 'Medium', color: '#f5ca00', index: 2 },
      { label: 'Low', color: '#00c875', index: 3 },
    ];
    priorityOptions = [...originalPriorityOptions];
  }

  // Parse current priority value
  let currentPriorityLabel: string | null = null;
  let currentPriorityIndex: number | null = null;

  if (value) {
    // Check if value has label/index directly (from GraphQL StatusValue fragment - priority uses same structure)
    if (value.label !== undefined && value.label !== null) {
      currentPriorityLabel = String(value.label).trim();
      if (value.index !== undefined && value.index !== null) {
        currentPriorityIndex = parseInt(String(value.index), 10);
      } else {
        // Find index by matching label
        const option = originalPriorityOptions.find(p => 
          p.label.trim().toLowerCase() === (currentPriorityLabel || '').toLowerCase()
        );
        currentPriorityIndex = option?.index !== undefined ? option.index : null;
      }
    }
    // Check if value.value is a JSON string
    else if (value.value && typeof value.value === 'string') {
      try {
        const parsed = JSON.parse(value.value);
        if (parsed.label) {
          currentPriorityLabel = String(parsed.label).trim();
          currentPriorityIndex = parsed.index !== undefined && parsed.index !== null 
            ? parseInt(String(parsed.index), 10) 
            : null;
        } else if (parsed.index !== undefined && parsed.index !== null) {
          // Only index provided, find label from options
          const indexNum = parseInt(String(parsed.index), 10);
          const option = originalPriorityOptions.find(p => p.index === indexNum);
          currentPriorityLabel = option?.label || null;
          currentPriorityIndex = indexNum;
        }
      } catch {
        // Not JSON, try text
        if (value.text) {
          currentPriorityLabel = String(value.text).trim();
        }
      }
    }
    // Check text property
    else if (value.text) {
      currentPriorityLabel = String(value.text).trim();
      // Try to find matching option by text
      const option = originalPriorityOptions.find(p => 
        p.label.trim().toLowerCase() === (currentPriorityLabel || '').toLowerCase()
      );
      if (option) {
        currentPriorityIndex = option.index;
      }
    }
  }

  // Find current priority option - try by label first, then by index
  let currentPriorityOption: { label: string; color: string; index: number } | null = null;
  
  if (currentPriorityLabel) {
    currentPriorityOption = originalPriorityOptions.find(p => 
      p.label.trim().toLowerCase() === currentPriorityLabel!.trim().toLowerCase()
    ) || null;
  }
  
  // If not found by label, try by index
  if (!currentPriorityOption && currentPriorityIndex !== null) {
    currentPriorityOption = originalPriorityOptions.find(p => p.index === currentPriorityIndex) || null;
  }

  const displayLabel = currentPriorityLabel || (currentPriorityOption?.label) || 'Not Set';
  
  // Get color - prioritize option color, then infer from label
  let currentColor = '#c4c4c4'; // Default light grey
  if (currentPriorityOption?.color) {
    currentColor = currentPriorityOption.color;
  } else if (currentPriorityLabel && currentPriorityLabel !== 'Not Set') {
    currentColor = getPriorityColor(currentPriorityLabel);
  } else if (displayLabel && displayLabel !== 'Not Set') {
    currentColor = getPriorityColor(displayLabel);
  }


  const handlePriorityChange = async (newLabel: string) => {
    // Find the priority option by label
    const priorityOption = originalPriorityOptions.find(p => 
      p.label.trim().toLowerCase() === newLabel.trim().toLowerCase()
    );

    if (!priorityOption) {
      showAlert({
        variant: 'error' as any,
        title: `Priority option not found: ${newLabel}`,
      });
      return;
    }

    setIsOpen(false);
    setIsUpdating(true);

    try {
      const priorityValue = { index: priorityOption.index };
      await mondayService.updateColumnValue(boardId, itemId, columnId, priorityValue);
      
      setIsUpdating(false);
      
      // Refresh data silently
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Update priority failed',
      });
    }
  };

  // Close on outside click or when clicking on another dropdown
  React.useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Close if clicking outside this dropdown (including on other dropdown triggers)
        const isThisDropdown = target.closest('[data-priority-popup]') || target.closest('[data-priority-trigger]');
        
        if (!isThisDropdown) {
          setIsOpen(false);
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

  // Position dropdown below the cell
  const cellRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && cellRef.current && dropdownRef.current) {
      const cellRect = cellRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      
      dropdown.style.top = `${cellRect.bottom + 4}px`;
      dropdown.style.left = `${cellRect.left}px`;
      dropdown.style.width = `${cellRect.width}px`;
      
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      if (dropdownRect.bottom > viewportHeight) {
        dropdown.style.top = `${cellRect.top - dropdownRect.height - 4}px`;
      }
      
      if (dropdownRect.right > viewportWidth) {
        dropdown.style.left = `${viewportWidth - dropdownRect.width - 8}px`;
      }
      
      if (dropdownRect.left < 0) {
        dropdown.style.left = '8px';
      }
    }
  }, [isOpen]);

  return (
    <>
      {isUpdating ? (
        <div
          className={styles.monday_cell}
          style={{
            padding: '4px 8px',
            minHeight: '24px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Skeleton variant="rectangular" width="100%" height="20px" style={{ borderRadius: '4px' }} />
        </div>
      ) : (
        <div
          ref={cellRef}
          data-priority-trigger
          className={styles.monday_cell_status}
          style={{
            backgroundColor: currentColor,
            position: 'relative',
            cursor: 'pointer',
            borderRadius: '6px',
            padding: '6px 12px',
            minHeight: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `0 1px 3px ${currentColor}40`,
            border: `1px solid ${currentColor}`,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 2px 6px ${currentColor}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 1px 3px ${currentColor}40`;
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
          <span style={{
            position: 'relative',
            zIndex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            padding: '0 8px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {displayLabel}
          </span>
          <ChevronDown 
            size={14} 
            style={{ 
              position: 'absolute', 
              right: '6px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              opacity: 0.9,
              pointerEvents: 'none',
              color: 'white',
            }} 
          />
        </div>
      )}

      {/* Sheet-style Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          data-priority-popup
          style={{
            position: 'fixed',
            zIndex: 2000,
            backgroundColor: 'white',
            border: `1px solid ${carterColors['grey-300']}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            padding: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {priorityOptions.map((priority) => {
            const isSelected = currentPriorityOption && 
              priority.label.trim().toLowerCase() === currentPriorityOption.label.trim().toLowerCase() &&
              priority.index === currentPriorityOption.index;
            
            return (
              <div
                key={priority.index}
                onClick={() => handlePriorityChange(priority.label)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? carterColors['grey-100'] : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = carterColors['grey-100'];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: priority.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400 }}>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {priority.label}
                  </Typography>
                </div>
                {isSelected && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: carterColors['text-400'] }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default PriorityCell;
