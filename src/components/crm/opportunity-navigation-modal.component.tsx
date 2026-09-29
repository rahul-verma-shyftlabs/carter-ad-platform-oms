import React from 'react';
import { Button, Typography, carterColors } from 'shyftlabs-dsl';
import { X, Plus, Home } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';

interface OpportunityNavigationModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (action: 'create-campaign' | 'go-home' | 'stay') => void;
  stageName: string;
}

const OpportunityNavigationModal: React.FC<OpportunityNavigationModalProps> = ({
  open,
  onClose,
  onNavigate,
  stageName,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Typography variant="h1-semibold" color={carterColors['text-900']}>
            Opportunity {stageName}
          </Typography>
          <Button
            variant="tertiary"
            size="small"
            icon={<X size={16} />}
            onClick={onClose}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Typography variant="body-regular" color={carterColors['text-700']}>
            This opportunity has reached the final stage. What would you like to do next?
          </Typography>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Button
            variant="primary"
            size="medium"
            label="Create Campaign"
            icon={<Plus size={16} />}
            onClick={() => onNavigate('create-campaign')}
            style={{ width: '100%' }}
          />
          <Button
            variant="secondary"
            size="medium"
            label="Go to Home"
            icon={<Home size={16} />}
            onClick={() => onNavigate('go-home')}
            style={{ width: '100%' }}
          />
          <Button
            variant="tertiary"
            size="medium"
            label="Stay on Page"
            onClick={() => onNavigate('stay')}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default OpportunityNavigationModal;
