import React, { useState } from 'react';
import { Skeleton } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface CheckboxCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const CheckboxCell: React.FC<CheckboxCellProps> = ({ value, itemId, columnId, boardId, onUpdate }) => {
  const mondayService = React.useMemo(() => new MondayService(), []);
  const [isUpdating, setIsUpdating] = useState(false);

  const isChecked = value?.checked === true || value?.value === 'true' || value?.text === 'true';


  const handleToggle = async () => {
    const newValue = !isChecked;
    setIsUpdating(true);
    
    try {
      await mondayService.updateColumnValue(boardId, itemId, columnId, {
        checked: newValue,
      });
      
      // Clear skeleton after successful update
      setIsUpdating(false);
      
      // Refresh data silently (getBoard will use silent mode)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      setIsUpdating(false);
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Update checkbox failed',
      });
    }
  };

  if (isUpdating) {
    return (
      <div
        className={styles.monday_cell}
        style={{
          padding: '6px 8px',
          minWidth: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Skeleton variant="rectangular" width="16px" height="16px" style={{ borderRadius: '2px' }} />
      </div>
    );
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
        handleToggle();
      }}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleToggle}
        style={{
          width: '16px',
          height: '16px',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};

export default CheckboxCell;
