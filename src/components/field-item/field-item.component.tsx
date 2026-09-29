import { carterColors, Tooltip, Typography } from 'shyftlabs-dsl';
import { Maybe } from 'types';
import { useEffect, useRef, useState } from 'react';
import { InfoIcon } from '@/lib/icons';
import styles from './field-item.module.scss';

interface IFieldItem {
  label: string;
  tooltip?: React.ReactNode;
  value?: React.ReactNode;
  updatedValue?: Maybe<string>;
  isRemoved?: boolean;
  className?: string;
}

const FieldItem: React.FC<IFieldItem> = props => {
  const { label, value, tooltip, updatedValue, isRemoved = false, className } = props;
  const updatedSpanRef = useRef<HTMLSpanElement | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const hasNewField =
    !isRemoved &&
    typeof value === 'string' &&
    typeof updatedValue === 'string' &&
    updatedValue !== undefined &&
    updatedValue !== value;

  const [isValueTruncated, setIsValueTruncated] = useState(false);
  const [isUpdatedTruncated, setIsUpdatedTruncated] = useState(false);

  useEffect(() => {
    if (spanRef.current) {
      setIsValueTruncated(spanRef.current.scrollWidth > spanRef.current.clientWidth);
    }
    if (updatedSpanRef.current) {
      setIsUpdatedTruncated(updatedSpanRef.current.scrollWidth > updatedSpanRef.current.clientWidth);
    }
  }, [value, updatedValue]);

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.label_wrapper}>
        <Typography variant="caption-medium" color={carterColors['text-600']}>
          {label}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoIcon size={16} color={carterColors['grey-400']} />
          </Tooltip>
        )}
      </div>
      {typeof value === 'string' ? (
        <div className={styles.values_wrapper}>
          {hasNewField && (
            <Tooltip title={isUpdatedTruncated ? updatedValue || '--' : undefined}>
              <span ref={updatedSpanRef}>{updatedValue !== undefined ? updatedValue || '--' : ''}</span>
            </Tooltip>
          )}
          <Tooltip title={isValueTruncated ? value : undefined}>
            <span ref={spanRef} className={isRemoved ? styles.removed_value : undefined}>
              {!hasNewField && !isRemoved && !value ? '--' : value}
            </span>
          </Tooltip>
        </div>
      ) : (
        value
      )}
    </div>
  );
};

export default FieldItem;
