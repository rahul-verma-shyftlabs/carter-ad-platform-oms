import { PropsWithChildren } from 'react';
import { carterColors, Tooltip, Typography } from 'shyftlabs-dsl';
import { InfoIcon } from '@/lib/icons';
import styles from './field.module.scss';

type TField = {
  label: React.ReactNode;
  RightComponent?: React.ElementType;
  className?: string;
  errorMessage?: any;
  moreInfo?: string;
  required?: boolean;
  fullWidth?: boolean;
  footerNote?: string;
  /** Label and control on one row (label left, control right), e.g. chip/radio rows. */
  labelInline?: boolean;
  compact?: boolean;
};

const Field: React.FC<PropsWithChildren<TField>> = props => {
  const {
    label,
    fullWidth = false,
    children,
    className = '',
    errorMessage = '',
    RightComponent,
    moreInfo = '',
    required = false,
    footerNote,
    labelInline = false,
    compact = false,
  } = props;
  const header = (
    <div className={styles.header_container} data-compact={compact}>
      <div className={styles.title_container}>
        {required ? (
          <Typography color={carterColors['text-800']} lineHeight="20px" fontFamily="Roboto">
            {label}&nbsp;&#x2a;
          </Typography>
        ) : (
          <Typography
            color={carterColors['text-800']}
            {...(compact && { variant: 'body-regular' })}
            lineHeight="20px"
            fontFamily="Roboto"
          >
            {label}
          </Typography>
        )}
        {moreInfo ? (
          <Tooltip title={moreInfo} placement="top">
            <InfoIcon color={carterColors['text-800']} size={16} />
          </Tooltip>
        ) : null}
      </div>
      {RightComponent ? <RightComponent /> : null}
    </div>
  );

  return (
    <div className={`${styles.container} ${className}`} data-full-width={fullWidth} data-label-inline={labelInline}>
      {labelInline ? (
        <div className={styles.inline_row}>
          <div className={styles.inline_label}>{header}</div>
          <div className={styles.inline_control}>{children}</div>
        </div>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
      {!!errorMessage ? (
        <div className={styles.error_message}>
          <Typography color={carterColors['red-700']}>{errorMessage}</Typography>
        </div>
      ) : !!footerNote ? (
        <div className={styles.footer_note}>
          <Typography variant="body-regular" color={carterColors['text-500']}>
            {footerNote}
          </Typography>
        </div>
      ) : null}
    </div>
  );
};

export default Field;
