import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Typography, carterColors } from 'shyftlabs-dsl';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import useSWR from 'swr';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import MondayService from '@/services/crm/monday/monday.service';
import ROUTES from '@/common/routes';
import styles from '../styles/crm.module.scss';

interface CRMApp {
  id: string;
  name: string;
  description: string;
  image?: string;
  connected: boolean;
  comingSoon?: boolean;
}

const CRMAppLibrary: React.FC = () => {
  const router = useRouter();
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const mondayService = useMemo(() => new MondayService(), []);

  // Check Salesforce connection status
  const { data: salesforceStatus } = useSWR(
    'salesforce-connection-status',
    async () => {
      try {
        return await salesforceService.getConnectionStatus();
      } catch (_error) {
        return { connected: false };
      }
    },
    { revalidateOnFocus: false }
  );

  // Check Monday.com connection status
  const { data: mondayStatus } = useSWR(
    'monday-connection-status',
    async () => {
      try {
        return await mondayService.getConnectionStatus();
      } catch (_error) {
        return { connected: false };
      }
    },
    { revalidateOnFocus: false }
  );

  const isSalesforceConnected = salesforceStatus?.connected || false;
  const isMondayConnected = mondayStatus?.connected || false;

  const crmApps: CRMApp[] = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Connect your Salesforce account to sync leads, contacts, opportunities, and accounts.',
      connected: isSalesforceConnected,
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png',
    },
    {
      id: 'monday',
      name: 'Monday.com',
      description: 'Connect your Monday.com account to view and manage boards, tasks, and projects.',
      connected: isMondayConnected,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqIvjWjRTI1JvYoPEfUp3ielEzlFHcJGfSjg&s',
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Connect your HubSpot account to sync contacts, companies, and deals.',
      connected: false,
      comingSoon: true,
      image: 'https://logos-world.net/wp-content/uploads/2022/01/HubSpot-Symbol.png',
    },
    {
      id: 'zoho',
      name: 'Zoho',
      description: 'Connect your Zoho CRM to sync contacts, deals, and activities.',
      connected: false,
      comingSoon: true,
      image: 'https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-web.svg',
    },
    {
      id: 'placements-io',
      name: 'Placements.io',
      description: 'Connect your Placements.io account to streamline order management and revenue operations.',
      connected: false,
      comingSoon: true,
      image: 'https://www.google.com/s2/favicons?domain=placements.io&sz=128',
    },
    {
      id: 'boostr',
      name: 'Boostr',
      description: 'Connect your Boostr account to manage sales pipelines, deals, and media planning.',
      connected: false,
      comingSoon: true,
      image: 'https://www.google.com/s2/favicons?domain=boostr.com&sz=128',
    },
    {
      id: 'operative',
      name: 'Operative',
      description: 'Connect your Operative account to manage ad sales, orders, and campaign workflows.',
      connected: false,
      comingSoon: true,
      image: 'https://www.operative.com/wp-content/uploads/2023/03/operative-logomark@2x-e1680556738419.png',
    },
  ];

  const handleAppClick = useCallback(
    (app: CRMApp) => {
      if (app.comingSoon) return;
      if (app.id === 'salesforce') {
        if (isSalesforceConnected) {
          router.push(ROUTES.CRM.SALESFORCE.DATA);
        } else {
          router.push(ROUTES.CRM.SALESFORCE.CONNECT);
        }
      } else if (app.id === 'monday') {
        if (isMondayConnected) {
          router.push(ROUTES.CRM.MONDAY.DATA);
        } else {
          router.push(ROUTES.CRM.MONDAY.CONNECT);
        }
      }
    },
    [isSalesforceConnected, isMondayConnected, router]
  );

  return (
    <div className={styles.app_library_container}>
      <Typography variant="subtitle-semibold" color={carterColors['text-900']}>
      Core OMS Integrations
      </Typography>
      <div style={{ marginTop: '8px' }}>
        <Typography variant="body-regular" color={carterColors['text-600']}>
        Connect your OMS systems to manage your data
      </Typography>
      </div>

      <div className={styles.apps_grid}>
        {crmApps.map(app => (
          <div
            key={app.id}
            className={styles.app_card}
            onClick={() => !app.comingSoon && handleAppClick(app)}
            style={{
              opacity: app.comingSoon ? 0.85 : 1,
              cursor: app.comingSoon ? 'default' : 'pointer',
            }}
          >
            <div className={styles.app_card_header}>
              <div className={styles.app_logo_section}>
                <div className={styles.app_logo_placeholdere}>
                  <Image src={app.image || ''} alt={app.name} width={70} height={48} className={styles.app_logo} />
                </div>
                <div className={styles.app_info}>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {app.name}
                  </Typography>
                  {app.connected && (
                    <div className={styles.connected_badge}>
                      <CheckCircle2 size={14} color={carterColors['green-700']} />
                      <Typography variant="caption-regular" color={carterColors['green-700']}>
                        Connected
                      </Typography>
                    </div>
                  )}
                  {app.comingSoon && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginTop: '4px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: carterColors['grey-200'],
                      }}
                    >
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Coming soon
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                {app.description}
              </Typography>
            </div>

            <div className={styles.app_card_footer}>
              <Button
                variant={app.connected ? 'secondary' : 'primary'}
                size="small"
                label={app.comingSoon ? 'Coming soon' : app.connected ? 'View Data' : 'Connect'}
                icon={!app.comingSoon ? <ExternalLink size={16} /> : undefined}
                iconPosition="right"
                disabled={app.comingSoon}
                onClick={e => {
                  e.stopPropagation();
                  if (!app.comingSoon) handleAppClick(app);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CRMAppLibrary;
