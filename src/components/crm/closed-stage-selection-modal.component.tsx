import React from 'react';
import { Button, Typography, carterColors } from 'shyftlabs-dsl';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';

interface ClosedStageSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (stage: 'Closed Won' | 'Closed Lost') => void;
  isLoading?: boolean;
}

const ClosedStageSelectionModal: React.FC<ClosedStageSelectionModalProps> = ({
  open,
  onClose,
  onSelect,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: carterColors['brand-100'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={20} color={carterColors['brand-600']} />
            </div>
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              Close Opportunity
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

        <div style={{ marginBottom: '32px' }}>
          <Typography variant="body-regular" color={carterColors['text-700']}>
            How would you like to close this opportunity?
          </Typography>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button
            variant="primary"
            size="medium"
            label="Closed Won"
            icon={<CheckCircle2 size={18} />}
            iconPosition="left"
            onClick={() => onSelect('Closed Won')}
            disabled={isLoading}
            style={{ 
              width: '100%',
              backgroundColor: carterColors['green-700'],
              borderColor: carterColors['green-700']
            }}
          />
          <Button
            variant="primary"
            size="medium"
            label="Closed Lost"
            icon={<XCircle size={18} />}
            iconPosition="left"
            onClick={() => onSelect('Closed Lost')}
            disabled={isLoading}
            style={{ 
              width: '100%',
              backgroundColor: carterColors['red-700'],
              borderColor: carterColors['red-700']
            }}
          />
          <Button
            variant="secondary"
            size="medium"
            label="Cancel"
            onClick={onClose}
            disabled={isLoading}
            style={{ width: '100%', marginTop: '8px' }}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default ClosedStageSelectionModal;
