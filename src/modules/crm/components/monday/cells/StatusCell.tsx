import React, { useState } from 'react';
import { carterColors } from 'shyftlabs-dsl';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface StatusCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  settings?: string;
  onUpdate?: () => void;
}

const StatusCell: React.FC<StatusCellProps> = ({ value, itemId, columnId, boardId, settings, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mondayService = React.useMemo(() => new MondayService(), []);

  // Define the desired order for status labels
  const DESIRED_ORDER = ['Done', 'Working on it', 'Stuck', 'Not Started'];

  // Helper function to reorder status options according to desired order
  const reorderStatusOptions = (options: Array<{ label: string; color: string; index: number }>) => {
    const ordered: Array<{ label: string; color: string; index: number }> = [];
    const remaining = [...options];
    
    // Separate blank option (index -1) from other options
    const blankOption = remaining.find(opt => opt.index === -1 || !opt.label || opt.label.trim() === '');
    if (blankOption) {
      const blankIndex = remaining.indexOf(blankOption);
      remaining.splice(blankIndex, 1);
    }

    // First, add options in the desired order
    DESIRED_ORDER.forEach(desiredLabel => {
      const foundIndex = remaining.findIndex(opt => 
        opt.label.trim().toLowerCase() === desiredLabel.toLowerCase()
      );
      if (foundIndex !== -1) {
        ordered.push(remaining[foundIndex]);
        remaining.splice(foundIndex, 1);
      }
    });

    // Then, add any remaining options that weren't in the desired order
    ordered.push(...remaining);
    
    // Blank option will be shown separately in the dropdown, so we don't need to include it here
    // But we keep it in originalStatusOptions for lookups

    return ordered;
  };

  // Parse settings to get status options
  let originalStatusOptions: Array<{ label: string; color: string; index: number }> = [];
  let statusOptions: Array<{ label: string; color: string; index: number }> = [];
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      const labels = parsed.labels || {};
      const labelsColors = parsed.labels_colors || {}; // Monday.com uses labels_colors, not colors

      // CRITICAL: Parse indices correctly - Monday.com uses the keys as indices
      originalStatusOptions = Object.entries(labels).map(([indexStr, label]: [string, any]) => {
        const index = parseInt(indexStr, 10);
        
        // Get color from labels_colors (Monday.com structure)
        // labels_colors structure: { "1": { "color": "#00c875", "border": "#00b461", "var_name": "green-shadow" } }
        let color: string | undefined = undefined;
        const colorInfo = labelsColors[indexStr];
        if (colorInfo && colorInfo.color) {
          color = colorInfo.color;
        }
        
        // Fallback: try parsed.colors (legacy format)
        if (!color) {
          color = parsed.colors?.[indexStr];
        }
        
        // Final fallback: infer color from label if not provided
        if (!color || color === '#808080') {
          const labelLower = String(label).trim().toLowerCase();
          if (labelLower === 'done' || labelLower.includes('done')) {
            color = '#00c875'; // Green
          } else if (labelLower === 'stuck' || labelLower.includes('stuck')) {
            color = '#e2445c'; // Red
          } else if (labelLower.includes('working')) {
            color = '#fdab3d'; // Orange
          } else if (labelLower === 'not started' || labelLower.includes('not started')) {
            color = '#c4c4c4'; // Light grey
          } else {
            color = '#c4c4c4'; // Default light grey instead of dark grey
          }
        }
        
        return {
          label: String(label).trim(),
          color: color,
          index: index,
        };
      });
      
      // ALWAYS add blank option - even if one exists, ensure it's there
      // Remove any existing blank options first to avoid duplicates
      originalStatusOptions = originalStatusOptions.filter(s => s.label && s.label.trim() !== '');
      // Add blank option with grey color and a special index (-1 to indicate blank)
      originalStatusOptions.push({
        label: '',
        color: '#c4c4c4', // Light grey
        index: -1, // Special index for blank
      });
      
      // Store original for lookups, reorder for display
      statusOptions = reorderStatusOptions([...originalStatusOptions]);
    } catch {
      // Default statuses if parsing fails - in desired order
      originalStatusOptions = [
        { label: 'Done', color: '#00c875', index: 2 },
        { label: 'Working on it', color: '#fdab3d', index: 1 },
        { label: 'Stuck', color: '#e2445c', index: 3 },
        { label: 'Not Started', color: '#c4c4c4', index: 0 },
      ];
      // ALWAYS add blank option
      originalStatusOptions.push({
        label: '',
        color: '#c4c4c4',
        index: -1,
      });
      statusOptions = reorderStatusOptions([...originalStatusOptions]);
    }
  } else {
    // Default statuses - in desired order
    originalStatusOptions = [
      { label: 'Done', color: '#00c875', index: 2 },
      { label: 'Working on it', color: '#fdab3d', index: 1 },
      { label: 'Stuck', color: '#e2445c', index: 3 },
      { label: 'Not Started', color: '#c4c4c4', index: 0 },
    ];
    // ALWAYS add blank option
    originalStatusOptions.push({
      label: '',
      color: '#c4c4c4',
      index: -1,
    });
    statusOptions = reorderStatusOptions([...originalStatusOptions]);
  }

  // Use prop value
  const valueToUse = value;

  // Check for blank/empty option in status options (empty label or specific indicator)
  const findBlankOption = () => {
    const lookupArray = originalStatusOptions.length > 0 ? originalStatusOptions : statusOptions;
    // Look for option with empty label, or label that represents blank/empty
    return lookupArray.find(s => 
      !s.label || 
      s.label.trim() === '' || 
      s.label.trim().toLowerCase() === 'blank' ||
      s.label.trim().toLowerCase() === 'empty'
    );
  };

  // Parse current status value - handle both direct object and JSON string formats
  let currentStatusLabel: string | null = null;
  let currentStatusIndex: number | null = null;
  let isBlank = false;

  if (valueToUse) {
    // Check if value has label/index directly (from GraphQL StatusValue fragment)
    if (valueToUse.label !== undefined && valueToUse.label !== null) {
      // Check if label is empty/blank
      if (valueToUse.label.trim() === '') {
        isBlank = true;
      } else {
        currentStatusLabel = valueToUse.label;
        // If index is null/undefined, try to find it from the settings by matching label
        if (valueToUse.index !== undefined && valueToUse.index !== null) {
          currentStatusIndex = valueToUse.index;
        } else {
          // Index is null, find it from settings by matching label
          const lookupArray = originalStatusOptions.length > 0 ? originalStatusOptions : statusOptions;
          const option = lookupArray.find(s => s.label.trim().toLowerCase() === valueToUse.label.trim().toLowerCase());
          currentStatusIndex = option?.index !== undefined ? option.index : null;
        }
      }
    }
    // Check if value.value is a JSON string that needs parsing
    else if (valueToUse.value && typeof valueToUse.value === 'string') {
      try {
        const parsed = JSON.parse(value.value);
        if (parsed.label) {
          // Check if label is empty/blank
          if (parsed.label.trim() === '') {
            isBlank = true;
          } else {
            currentStatusLabel = parsed.label;
            currentStatusIndex = parsed.index !== undefined && parsed.index !== null ? parsed.index : null;
            // If index is still null, find it from settings
            if (currentStatusIndex === null) {
              const lookupArray = originalStatusOptions.length > 0 ? originalStatusOptions : statusOptions;
              const option = lookupArray.find(s => s.label.trim().toLowerCase() === parsed.label.trim().toLowerCase());
              currentStatusIndex = option?.index !== undefined ? option.index : null;
            }
          }
        } else if (parsed.index !== undefined && parsed.index !== null) {
          // If only index is available, find the label from originalStatusOptions
          currentStatusIndex = parsed.index;
          const lookupArray = originalStatusOptions.length > 0 ? originalStatusOptions : statusOptions;
          const option = lookupArray.find(s => s.index === parsed.index);
          currentStatusLabel = option?.label || null;
          if (!currentStatusLabel || currentStatusLabel.trim() === '') {
            isBlank = true;
          }
        }
      } catch {
        // If parsing fails, try text field
        const textValue = value.text || null;
        if (!textValue || textValue.trim() === '') {
          isBlank = true;
        } else {
          currentStatusLabel = textValue;
        }
      }
    }
    // Fallback to text field
    else if (valueToUse.text) {
      if (valueToUse.text.trim() === '') {
        isBlank = true;
      } else {
        currentStatusLabel = valueToUse.text;
        // Try to find matching option by label - use original array for correct index
        const lookupArray = originalStatusOptions.length > 0 ? originalStatusOptions : statusOptions;
        const option = lookupArray.find(s => s.label.trim().toLowerCase() === valueToUse.text.trim().toLowerCase());
        currentStatusIndex = option?.index !== undefined ? option.index : null;
      }
    }
  } else {
    // Value is null/undefined/empty - treat as blank
    isBlank = true;
  }

  // If blank, find the blank option or create one
  const blankOption = findBlankOption();
  const lookupArray = originalStatusOptions.length > 0 ? originalStatusOptions : statusOptions;
  
  let displayLabel: string;
  let displayIndex: number | null;
  
  if (isBlank) {
    if (blankOption) {
      displayLabel = blankOption.label || '';
      displayIndex = blankOption.index;
    } else {
      // No blank option found, show empty string
      displayLabel = '';
      displayIndex = null;
    }
  } else {
    displayLabel = currentStatusLabel || statusOptions[0]?.label || 'Not Started';
    const findStatusIndex = lookupArray.find(s => s.label.trim().toLowerCase() === displayLabel.trim().toLowerCase());
    displayIndex = currentStatusIndex !== null ? currentStatusIndex : (findStatusIndex?.index ?? 0);
  }
  
  // Find the exact status option by label first (most reliable), then by index if label doesn't match
  // This ensures we get the correct color for the status
  let currentStatusOption: { label: string; color: string; index: number } | undefined;
  
  if (isBlank) {
    // For blank, find the blank option
    currentStatusOption = lookupArray.find(s => !s.label || s.label.trim() === '');
    // If blank option not found but we have a displayIndex, try to find by index
    if (!currentStatusOption && displayIndex !== null && displayIndex !== -1) {
      currentStatusOption = lookupArray.find(s => s.index === displayIndex);
      // If found option has a label, it's not blank, so clear it
      if (currentStatusOption && currentStatusOption.label && currentStatusOption.label.trim() !== '') {
        currentStatusOption = undefined;
      }
    }
  } else {
    currentStatusOption = lookupArray.find(s => s.label.trim().toLowerCase() === displayLabel.trim().toLowerCase());
    if (!currentStatusOption && displayIndex !== null) {
      currentStatusOption = lookupArray.find(s => s.index === displayIndex);
    }
  }
  
  // Conditional background color based on status - with fallback colors
  const getStatusBackgroundColor = (): string => {
    // If blank, return grey color
    if (isBlank || !displayLabel || displayLabel.trim() === '') {
      return '#c4c4c4'; // Light grey for blank
    }
    
    // First try to get color from the matched status option
    if (currentStatusOption?.color) {
      // Use the color from settings (from labels_colors)
      return currentStatusOption.color;
    }
    
    // Fallback: try to get color from settings directly using current index
    if (settings && currentStatusIndex !== null) {
      try {
        const parsed = JSON.parse(settings);
        const labelsColors = parsed.labels_colors || {};
        const colorInfo = labelsColors[String(currentStatusIndex)];
        if (colorInfo && colorInfo.color) {
          return colorInfo.color;
        }
      } catch {
        // Ignore parsing errors, continue to fallback
      }
    }
    
    // Fallback to conditional colors based on status label
    const labelLower = displayLabel.toLowerCase().trim();
    
    if (labelLower === 'done' || labelLower.includes('done')) {
      return '#00c875'; // Green for Done
    } else if (labelLower === 'stuck' || labelLower.includes('stuck')) {
      return '#e2445c'; // Red for Stuck
    } else if (labelLower.includes('working')) {
      return '#fdab3d'; // Orange for Working on it
    } else if (labelLower === 'not started' || labelLower.includes('not started')) {
      return '#c4c4c4'; // Light gray for Not Started
    }
    
    // Default light gray fallback
    return '#c4c4c4';
  };
  
  const currentColor = getStatusBackgroundColor();


  const handleStatusChange = async (newLabel: string) => {

    // CRITICAL: ALWAYS use originalStatusOptions for lookup to get the correct Monday.com index
    if (originalStatusOptions.length === 0) {
      showAlert({
        variant: 'error' as any,
        title: 'Status options not properly initialized',
      });
      return;
    }

    // Check if blank option is selected (empty label)
    const isBlankSelection = !newLabel || newLabel.trim() === '';
    
    // Find the status option by label
    const statusOption = originalStatusOptions.find(s => {
      if (isBlankSelection) {
        // For blank, match empty label
        return !s.label || s.label.trim() === '';
      } else {
        return s.label.trim().toLowerCase() === newLabel.trim().toLowerCase();
      }
    });

    setIsOpen(false);
    setIsUpdating(true);

    // Save and wait for new value to be fetched
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
      
      if (isBlankSelection || statusOption?.index === -1) {
        // Clear the status value - find the blank option with a real index
        const blankOptionWithIndex = originalStatusOptions.find(s => 
          (!s.label || s.label.trim() === '') && s.index !== -1
        );
        
        if (blankOptionWithIndex) {
          // Use the blank option's index from Monday.com
          const statusValue = { index: blankOptionWithIndex.index };
          await mondayService.updateColumnValue(boardId, itemId, columnId, statusValue);
        } else {
          // If no blank option exists in Monday.com settings, try multiple methods to clear it
          let cleared = false;
          
          // Method 1: Try to find an option with empty label in settings (might have index 0 or other)
          // Check if settings has a blank option we missed by re-parsing
          if (settings) {
            try {
              const parsed = JSON.parse(settings);
              const labels = parsed.labels || {};
              // Look for any label that is empty or blank
              for (const [indexStr, label] of Object.entries(labels)) {
                if (!label || String(label).trim() === '') {
                  const statusValue = { index: parseInt(indexStr, 10) };
                  await mondayService.updateColumnValue(boardId, itemId, columnId, statusValue);
                  cleared = true;
                  break;
                }
              }
            } catch {
              // Ignore parsing errors, continue to next method
            }
          }
          
          // Method 2: If still not cleared, try sending null index
          if (!cleared) {
            try {
              await mondayService.updateColumnValue(boardId, itemId, columnId, { index: null });
              cleared = true;
            } catch {
              // If null doesn't work, continue to next method
            }
          }
          
          // Method 3: Try sending empty object
          if (!cleared) {
            try {
              await mondayService.updateColumnValue(boardId, itemId, columnId, {});
              cleared = true;
            } catch {
              // Ignore errors
            }
          }
          
          // Method 4: If still not cleared, allow it anyway for subitems
          // The UI will show blank, and we'll refresh to see the actual state
          // This allows users to set blank status even if Monday.com doesn't fully support it
          if (!cleared) {
            // Don't show error - just proceed
            // The refresh will show the actual state from Monday.com
            // If Monday.com doesn't support blank, it will show the previous value
            // But at least we don't block the user from trying
          }
        }
      } else {
        if (!statusOption) {
          showAlert({
            variant: 'error' as any,
            title: `Status option not found: ${newLabel}`,
          });
          setIsUpdating(false);
          return;
        }
        
        const statusValue = { index: statusOption.index };
        await mondayService.updateColumnValue(boardId, itemId, columnId, statusValue);
      }
      
      // Clear skeleton after successful update
      setIsUpdating(false);
      
      // Refresh data silently (getBoard will use silent mode)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Update status failed';
      showAlert({
        variant: 'error' as any,
        title: errorMessage,
      });
    }
  };

  // Close on outside click or when clicking on another dropdown
  React.useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Close if clicking outside this dropdown (including on other dropdown triggers)
        const isThisDropdown = target.closest('[data-status-popup]') || target.closest('[data-status-trigger]');
        
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

  const cellRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Position dropdown below the cell
  React.useEffect(() => {
    if (isOpen && cellRef.current && dropdownRef.current) {
      const cellRect = cellRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      
      // Position dropdown below the cell
      dropdown.style.top = `${cellRect.bottom}px`;
      dropdown.style.left = `${cellRect.left}px`;
      dropdown.style.width = `${cellRect.width}px`;
      
      // Adjust if dropdown would go off screen
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // If dropdown goes below viewport, show above instead
      if (dropdownRect.bottom > viewportHeight) {
        dropdown.style.top = `${cellRect.top - dropdownRect.height}px`;
      }
      
      // If dropdown goes off right edge, align to right
      if (dropdownRect.right > viewportWidth) {
        dropdown.style.left = `${viewportWidth - dropdownRect.width - 8}px`;
      }
      
      // If dropdown goes off left edge, align to left
      if (dropdownRect.left < 0) {
        dropdown.style.left = '8px';
      }
    }
  }, [isOpen]);

  return (
    <>
      {isUpdating ? (
        <div
          className={styles.monday_cell_status}
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
          data-status-trigger
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
          {!isBlank && (
            <span style={{
              position: 'relative',
              zIndex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              padding: '0 4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}>
              {displayLabel}
            </span>
          )}
          {isBlank && (
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: '#c4c4c4',
                flexShrink: 0,
              }}
            />
          )}
          <ChevronDown 
            size={14} 
            style={{ 
              position: 'absolute', 
              right: '6px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              opacity: 0.7,
              pointerEvents: 'none',
            }} 
          />
        </div>
      )}

      {/* Sheet-style Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          data-status-popup
          style={{
            position: 'fixed',
            zIndex: 2000,
            backgroundColor: 'white',
            border: `1px solid ${carterColors['grey-300']}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '4px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Show blank option first - ALWAYS show it */}
          <div
            key="blank-status-option"
            onClick={() => handleStatusChange('')}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: carterColors['text-900'],
              backgroundColor: isBlank ? carterColors['brand-100'] : 'transparent',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!isBlank) {
                e.currentTarget.style.backgroundColor = carterColors['grey-100'];
              }
            }}
            onMouseLeave={(e) => {
              if (!isBlank) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: '#c4c4c4',
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}></span>
            {isBlank && (
              <CheckCircle2 size={14} color={carterColors['brand-600']} />
            )}
          </div>
          {/* Show other status options */}
          {statusOptions.filter(s => s.label && s.label.trim() !== '').map((status) => {
                  // Match by label (most reliable) - this ensures only one item is selected
                  // Even if indices are null or don't match, label matching is unique
                  const isSelected = !isBlank && status.label.trim().toLowerCase() === displayLabel.trim().toLowerCase();
                  return (
                    <div
                      key={`${status.index}-${status.label}`}
                      onClick={() => handleStatusChange(status.label)}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: carterColors['text-900'],
                        backgroundColor: isSelected ? carterColors['brand-100'] : 'transparent',
                        transition: 'background-color 0.1s ease',
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
                          backgroundColor: status.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{status.label}</span>
                      {isSelected && (
                        <CheckCircle2 size={14} color={carterColors['brand-600']} />
                      )}
                    </div>
                  );
                })}
        </div>
      )}
    </>
  );
};

export default StatusCell;
