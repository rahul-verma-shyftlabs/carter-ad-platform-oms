import React from 'react';
import { useRouter } from 'next/router';
import { Typography, Button, carterColors } from 'shyftlabs-dsl';
import { AlertCircle, FileSpreadsheet } from 'lucide-react';
import ROUTES from '@/common/routes';
import { useMondayConnection, useMondayBoards } from '../../hooks';
import MondayBoardView from '../monday/monday-board-view.component';
import styles from '../../styles/crm.module.scss';

const AD_OPERATIONS_HAND_OFF_BOARD_NAME = 'Ad Operations Hand Off';

/**
 * Ad Ops Overview Sheet – shows the Monday.com board "Ad Operations Hand Off"
 * with full board capabilities (view, edit, groups, columns, items, etc.).
 */
const CarterOMSAdOpsOverviewSheet: React.FC = () => {
  const router = useRouter();
  const { isConnected, isLoading: connectionLoading } = useMondayConnection();
  const { boards, isLoading: boardsLoading } = useMondayBoards();

  const adOpsBoard = React.useMemo(() => {
    const name = AD_OPERATIONS_HAND_OFF_BOARD_NAME.toLowerCase();
    return boards.find((b) => b.name?.toLowerCase() === name) ?? null;
  }, [boards]);

  if (connectionLoading || (isConnected && boardsLoading)) {
    return (
      <div className={styles.empty_state} style={{ padding: '48px 24px' }}>
        <Typography variant="body-regular" color={carterColors['text-600']}>
          Loading…
        </Typography>
      </div>
    );
  }

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
              Connect your Monday.com account to view the Ad Operations Hand Off board
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

  if (!adOpsBoard) {
    return (
      <div className={styles.empty_state} style={{ padding: '48px 24px' }}>
        <FileSpreadsheet size={40} color={carterColors['text-400']} style={{ marginBottom: '16px' }} />
        <Typography variant="body-semibold" color={carterColors['text-700']}>
          Board not found
        </Typography>
        <Typography variant="body-regular" color={carterColors['text-600']}>
          <span style={{ marginTop: '8px', maxWidth: '400px', display: 'block' }}>
            No Monday.com board named &quot;{AD_OPERATIONS_HAND_OFF_BOARD_NAME}&quot; was found.
            Create it in Monday.com or open another board from the Monday.com section.
          </span>
        </Typography>
        <Button
          variant="secondary"
          size="small"
          label="Open Monday.com boards"
          onClick={() => router.push(ROUTES.CRM.MONDAY.DATA)}
          style={{ marginTop: '16px' }}
        />
      </div>
    );
  }

  return (
    <div className={styles.ad_ops_overview_sheet_wrapper}>
      <MondayBoardView boardId={adOpsBoard.id} hideHeader />
    </div>
  );
};

export default CarterOMSAdOpsOverviewSheet;
