import React from 'react';
import { Button, Typography, carterColors } from 'shyftlabs-dsl';
import { AlertTriangle, X } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: carterColors['red-700'],
          buttonColor: carterColors['red-700'],
        };
      case 'warning':
        return {
          iconColor: carterColors['yellow-700'],
          buttonColor: carterColors['yellow-700'],
        };
      default:
        return {
          iconColor: carterColors['brand-600'],
          buttonColor: carterColors['brand-600'],
        };
    }
  };

  const colors = getVariantColors();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color={colors.iconColor} />
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              {title}
            </Typography>
          </div>
          <Button
            variant="tertiary"
            size="small"
            icon={<X size={16} />}
            onClick={onClose}
            disabled={isLoading}
          />
        </div>

        <div style={{ marginBottom: '24px', lineHeight: '1.6' }}>
          <Typography variant="body-regular" color={carterColors['text-700']}>
            {message}
          </Typography>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button
            variant="secondary"
            size="medium"
            label={cancelLabel}
            onClick={onClose}
            disabled={isLoading}
          />
          <Button
            variant="primary"
            size="medium"
            label={confirmLabel}
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: variant === 'danger' ? colors.buttonColor : undefined,
              borderColor: variant === 'danger' ? colors.buttonColor : undefined,
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmationModal;
