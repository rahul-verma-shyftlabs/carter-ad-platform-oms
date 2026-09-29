import React from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Typography,
  carterColors,
} from 'shyftlabs-dsl';
import {
  AlertCircle,
} from 'lucide-react';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import styles from '../styles/crm.module.scss';
import { useMondayConnection } from '../hooks';
import MondayBoardsDashboard from './monday/monday-boards-dashboard.component';

const MondayDataView: React.FC = () => {
  const router = useRouter();
  const mondayService = React.useMemo(() => new MondayService(), []);

  // Check connection status
  const { connectionStatus, isConnected, mutate: mutateConnectionStatus } = useMondayConnection();

  const handleDisconnect = async () => {
    try {
      await mondayService.disconnect();
      mutateConnectionStatus();
      showAlert({
        variant: 'success' as any,
        title: 'Monday.com disconnected successfully',
      });
      router.push(ROUTES.CRM.BASE);
    } catch (error: any) {
      showAlert({
        variant: 'error' as any,
        title: error?.message || 'Failed to disconnect Monday.com',
      });
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.connector_container}>
        <div className={styles.connector_content} style={{ textAlign: 'center' }}>
          <AlertCircle size={48} color={carterColors['text-600']} />
          <div style={{ marginTop: '24px' }}>
            <Typography variant="h3-semibold" color={carterColors['text-900']}>
              Monday.com not connected
            </Typography>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Please connect your Monday.com account to view boards
            </Typography>
          </div>
          <div style={{ marginTop: '24px' }}>
            <Button
              variant="primary"
              size="medium"
              label="Connect Monday.com"
              onClick={() => router.push(ROUTES.CRM.MONDAY.CONNECT)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <MondayBoardsDashboard
      connectionStatus={connectionStatus}
      onDisconnect={handleDisconnect}
      onRefresh={() => mutateConnectionStatus()}
    />
  );
};

export default MondayDataView;
