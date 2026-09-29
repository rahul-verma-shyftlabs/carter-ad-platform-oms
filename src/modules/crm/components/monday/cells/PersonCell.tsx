import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { User, ChevronDown } from 'lucide-react';
import { Skeleton, Tooltip } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import { useMondayUsers } from '../../../hooks';
import styles from '../../../styles/crm.module.scss';

interface PersonCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const PersonCell: React.FC<PersonCellProps> = ({ value, itemId, columnId, boardId, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mondayService = useMemo(() => new MondayService(), []);
  const cellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch users using custom hook
  const { users, isLoading: usersLoading } = useMondayUsers();
  
  // Parse the value - handle different structures from Monday.com API
  // The value can be:
  // 1. Direct object with persons_and_teams (from GraphQL PeopleValue fragment)
  // 2. Object with value as JSON string that needs parsing
  // 3. Object with personsAndTeams (camelCase)
  let assignedPersons: any[] = [];
  
  if (value) {
    // Case 1: Direct persons_and_teams (from GraphQL fragment)
    if (value.persons_and_teams && Array.isArray(value.persons_and_teams)) {
      assignedPersons = value.persons_and_teams;
    }
    // Case 2: CamelCase personsAndTeams
    else if (value.personsAndTeams && Array.isArray(value.personsAndTeams)) {
      assignedPersons = value.personsAndTeams;
    }
    // Case 3: Value is a JSON string that needs parsing
    else if (value.value && typeof value.value === 'string') {
      try {
        const parsed = JSON.parse(value.value);
        assignedPersons = parsed?.persons_and_teams || parsed?.personsAndTeams || [];
      } catch {
        // If parsing fails, try to use value as-is
      }
    }
    // Case 4: Value is already an object with persons_and_teams
    else if (typeof value === 'object' && (value as any).persons_and_teams) {
      assignedPersons = (value as any).persons_and_teams;
    }
  }
  const assignedPerson = assignedPersons[0];
  const assignedUser = assignedPerson
    ? users.find((u: any) => u.id === assignedPerson.id?.toString() || u.id === assignedPerson.id)
    : null;

  // Helper function to get initials from a name
  const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    // Get first letter of first name and first letter of last name
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Close on outside click or when clicking on another dropdown
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Close if clicking outside this dropdown (including on other dropdown triggers)
        const isThisDropdown = target.closest('[data-person-popup]') || target.closest('[data-person-trigger]');
        
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
  useEffect(() => {
    if (isOpen && cellRef.current && dropdownRef.current) {
      const cellRect = cellRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      
      // Position dropdown below the cell
      dropdown.style.top = `${cellRect.bottom + 4}px`;
      dropdown.style.left = `${cellRect.left}px`;
      dropdown.style.width = `${cellRect.width}px`;
      
      // Adjust if dropdown would go off screen
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // If dropdown goes below viewport, show above instead
      if (dropdownRect.bottom > viewportHeight) {
        dropdown.style.top = `${cellRect.top - dropdownRect.height - 4}px`;
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

  const handlePersonChange = async (userId: string) => {
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
      
      await mondayService.updateColumnValue(boardId, itemId, columnId, {
        personsAndTeams: userId ? [{ id: parseInt(userId), kind: 'person' }] : [],
      });
      
      // Clear skeleton after successful update
      setIsUpdating(false);
      
      // Refresh data silently (getBoard will use silent mode)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Update owner failed';
      showAlert({
        variant: 'error' as any,
        title: errorMessage,
      });
    }
  };

  if (isUpdating) {
    return (
      <div
        className={styles.monday_cell}
        style={{
          padding: '6px 8px',
          minWidth: '120px',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="20px" style={{ borderRadius: '2px' }} />
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      className={styles.monday_cell}
      style={{
        padding: '6px 8px',
        minWidth: '120px',
        position: 'relative',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        data-person-trigger
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
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
        {assignedUser ? (
          <>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: assignedUser.photo_small
                  ? 'transparent'
                  : carterColors['brand-600'],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                backgroundImage: assignedUser.photo_small ? `url(${assignedUser.photo_small})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!assignedUser.photo_small && getInitials(assignedUser.name)}
            </div>
            <Tooltip title={assignedUser.name} arrow>
              <div
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {/* <Typography variant="body-regular" color={carterColors['text-900']}>
                  {getInitials(assignedUser.name)}
                </Typography> */}
              </div>
            </Tooltip>
          </>
        ) : (
          <>
            <User size={12} color={carterColors['text-400']} />
            <div style={{ fontSize: '12px' }}>
              {/* <Typography variant="body-regular" color={carterColors['text-400']}>
                Unassigned
              </Typography> */}
            </div>
          </>
        )}
        <ChevronDown size={10} color={carterColors['text-400']} style={{ opacity: 0.6 }} />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          data-person-popup
          style={{
            position: 'fixed',
            zIndex: 2000,
            backgroundColor: 'white',
            border: `1px solid ${carterColors['grey-200']}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '4px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        
          <div
            onClick={() => handlePersonChange('')}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '4px',
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
          >
            <div style={{ fontSize: '12px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                Unassigned
              </Typography>
            </div>
          </div>
          {usersLoading ? (
            <div style={{ padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px' }}>
                <Typography variant="body-regular" color={carterColors['text-400']}>
                  Loading users...
                </Typography>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px' }}>
                <Typography variant="body-regular" color={carterColors['text-400']}>
                  No users available
                </Typography>
              </div>
            </div>
          ) : (
            users.map((user: any) => (
              <div
                key={user.id}
                onClick={() => handlePersonChange(user.id.toString())}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '4px',
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
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: user.photo_small ? 'transparent' : carterColors['brand-600'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundImage: user.photo_small ? `url(${user.photo_small})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!user.photo_small && getInitials(user.name)}
                </div>
                <div style={{ fontSize: '13px' }}>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {user.name}
                  </Typography>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PersonCell;
