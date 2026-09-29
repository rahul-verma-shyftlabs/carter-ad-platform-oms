import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { X, Plus } from 'lucide-react';
import { Tooltip } from '@/lib/material-ui';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import styles from '../../../styles/crm.module.scss';

interface TagsCellProps {
  value: any;
  itemId: string;
  columnId: string;
  boardId: string;
  onUpdate?: () => void;
}

const TagsCell: React.FC<TagsCellProps> = ({ value, itemId, columnId, boardId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const mondayService = useMemo(() => new MondayService(), []);

  // Parse tags from value
  const tags: string[] = value?.tag_ids 
    ? (Array.isArray(value.tag_ids) ? value.tag_ids : [value.tag_ids])
    : value?.text 
    ? value.text.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      const updatedTags = [...tags, newTag.trim()];
      await mondayService.updateColumnValue(boardId, itemId, columnId, {
        tag_ids: updatedTags,
      });
      setNewTag('');
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to add tag',
      });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const updatedTags = tags.filter(tag => tag !== tagToRemove);
      await mondayService.updateColumnValue(boardId, itemId, columnId, {
        tag_ids: updatedTags,
      });
      onUpdate?.();
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to remove tag',
      });
    }
  };

  const tagsRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const tagsText = tags.join(', ');

  // Check if tags are truncated
  useEffect(() => {
    if (tagsRef.current && tags.length > 0) {
      const element = tagsRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [tags]);

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
        if (!isEditing) {
          setIsEditing(true);
        }
      }}
    >
      <Tooltip title={isTruncated ? tagsText : ''} arrow>
        <div
          ref={tagsRef}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
            maxHeight: '32px',
            overflow: 'hidden',
            lineHeight: '16px',
          }}
        >
        {tags.map((tag, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              backgroundColor: carterColors['brand-100'],
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            <Typography variant="caption-regular" color={carterColors['brand-600']}>
              {tag}
            </Typography>
            <X
              size={12}
              color={carterColors['brand-600']}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
            />
          </div>
        ))}
        {isEditing ? (
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onBlur={handleAddTag}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setNewTag('');
              }
            }}
            autoFocus
            style={{
              minWidth: '80px',
              border: `1px solid ${carterColors['brand-600']}`,
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              color: carterColors['text-400'],
              cursor: 'pointer',
            }}
            onClick={() => setIsEditing(true)}
          >
            <Plus size={12} />
            <Typography variant="caption-regular" color={carterColors['text-400']}>
              Add tag
            </Typography>
          </div>
        )}
        </div>
      </Tooltip>
    </div>
  );
};

export default TagsCell;
