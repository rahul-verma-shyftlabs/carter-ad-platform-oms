import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Typography, carterColors } from 'shyftlabs-dsl';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { getOmsSession, isEmbedded } from '@/lib/oms-session';
import MondayService from '@/services/crm/monday/monday.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import styles from '../styles/crm.module.scss';

const MondayConnector: React.FC = () => {
  const router = useRouter();
  const mondayService = useMemo(() => new MondayService(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get user ID from Redux or cookie
  const reduxUser = useSelector((state: any) => state.common?.user || state.userData?.userData);
  const userId = reduxUser?.id || reduxUser?.accountId || getOmsSession().userId || null;

  // Check for error from callback (passed as query param from API route)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        showAlert({
          variant: 'error' as any,
          title: decodeURIComponent(errorParam),
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mondayService.getAuthorizationUrl(userId || undefined);
      if (response?.authorization_url) {
        // Store state and service type in sessionStorage for callback verification
        if (response.state) {
          sessionStorage.setItem('monday_oauth_state', response.state);
        }
        sessionStorage.setItem('oauth_service', 'monday'); // Mark this as Monday.com OAuth
        if (isEmbedded()) {
          const popup = window.open(response.authorization_url, 'oms-oauth', 'width=720,height=800');
          if (!popup) {
            window.top?.open(response.authorization_url, '_blank');
          }
        } else {
          window.location.href = response.authorization_url;
        }
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate connection. Please try again.');
      showAlert({
        variant: 'error' as any,
        title: err?.message || 'Failed to initiate Monday.com connection',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.connector_container}>
      <Button
        variant="tertiary"
        size="small"
        icon={<ArrowLeft size={16} />}
        iconPosition="left"
        label="Back to CRM"
        onClick={() => router.push(ROUTES.CRM.BASE)}
        style={{ marginBottom: '24px' }}
      />

      <div className={styles.connector_content}>
        <div className={styles.connector_header}>
          <div className={styles.app_logo_placeholder_large}>
            <Image
              src="https://cdn.monday.com/images/integrations/monday_icon.svg"
              alt="Monday.com"
              width={80}
              height={80}
            />
          </div>
          <Typography variant="h2-semibold" color={carterColors['text-900']}>
            Connect Monday.com
          </Typography>
          <div style={{ marginTop: '8px' }}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
            Connect your Monday.com account to view and manage your boards, tasks, and projects
          </Typography>
          </div>
        </div>

        <div className={styles.connector_info}>
          <div style={{ marginBottom: '16px' }}>
            <Typography variant="body-semibold" color={carterColors['text-900']}>
            What you'll get access to:
          </Typography>
          </div>
          <ul className={styles.features_list}>
            <li>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                View and manage all your boards
              </Typography>
            </li>
            <li>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                Create and edit tasks (items) in real-time
              </Typography>
            </li>
            <li>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                Organize tasks with groups and columns
              </Typography>
            </li>
            <li>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                Add comments and updates to tasks
              </Typography>
            </li>
            <li>
              <Typography variant="body-regular" color={carterColors['text-700']}>
                Full Monday.com experience in your dashboard
              </Typography>
            </li>
          </ul>
        </div>

        {error && (
          <div className={styles.error_message}>
            <AlertCircle size={16} color={carterColors['red-700']} />
            <Typography variant="body-regular" color={carterColors['red-700']}>
              {error}
            </Typography>
          </div>
        )}

        <div className={styles.connector_actions}>
          <Button
            variant="primary"
            size="medium"
            label={isLoading ? 'Connecting...' : 'Connect Monday.com'}
            icon={isLoading ? <Loader2 size={16} className="spin" /> : undefined}
            onClick={handleConnect}
            disabled={isLoading}
            style={{ width: '100%', maxWidth: '300px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default MondayConnector;
