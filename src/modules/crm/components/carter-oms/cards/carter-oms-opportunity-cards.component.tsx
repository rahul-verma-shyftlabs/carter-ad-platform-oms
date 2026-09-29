import React from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Plus as PlusIcon, Database } from 'lucide-react';
import { getOpportunityColumns } from '../../../helpers/salesforce-columns.helper';
import TicketCount from '../../salesforce-data-view/ticket-count.component';
import { CardComponentProps } from '../../salesforce-data-view/types';
import styles from '../../../styles/crm.module.scss';

interface CarterOMSOpportunityCardsProps extends Omit<CardComponentProps, 'onCreateTicket'> {
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'opportunity') => void;
  tickets?: { [opportunityId: string]: any[] };
  logoUrl: string;
}

const CarterOMSOpportunityCards: React.FC<CarterOMSOpportunityCardsProps> = ({
  data,
  searchTerm,
  viewMode,
  isLoading,
  columnVisibility,
  handleColumnVisibilityChange,
  enableColumnHiding,
  onNameClick,
  onCreateTicket,
  tickets,
  logoUrl,
}) => {
  const router = useRouter();
  const opportunities = data as any[];

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className={styles.empty_state}>
        <Database size={32} color={carterColors['text-400']} />
        <Typography variant="body-regular" color={carterColors['text-600']}>
          {searchTerm
            ? `No opportunities found matching "${searchTerm}"`
            : `No opportunities found`}
        </Typography>
      </div>
    );
  }

  if (viewMode === 'table') {
    const columns = getOpportunityColumns(
      (opportunity) => onCreateTicket(opportunity, 'opportunity'),
      onNameClick
    );
    return (
      <div className={styles.opportunities_wrapper}>
        <div className={styles.data_table_wrapper}>
          <DataTable
            columns={columns as any}
            data={opportunities}
            loading={isLoading}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            enableColumnHiding={enableColumnHiding}
            fallback={{
              title: `No opportunities found`,
              description: searchTerm
                ? `Try adjusting your search term`
                : `No opportunities data available`,
            }}
            pagination={{
              pageNo: 1,
              pageSize: 50,
              totalCount: opportunities.length,
            }}
          />
        </div>
      </div>
    );
  }

  const formatCurrency = (value: any): string => {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (value: any): string => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    } catch {
      return String(value);
    }
  };

  return (
    <div className={styles.opportunities_wrapper}>
      <div className={styles.carter_oms_cards_grid}>
        {opportunities.map((opportunity: any) => {
          return (
            <div
              key={opportunity.Id}
              className={styles.carter_oms_card}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/crm/opportunities/${opportunity.Id}?ref=carter`)}
            >
              <div className={styles.carter_oms_card_header}>
                <div>
                  <Image
                    src={logoUrl}
                    alt="Carter"
                    width={20}
                    height={20}
                  />
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTicket(opportunity, 'opportunity');
                  }}
                  style={{
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  <PlusIcon size={16} color={carterColors['brand-600']} />
                  <Typography variant="caption-regular" color={carterColors['brand-600']}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Ticket</span>
                  </Typography>
                </div>
              </div>

              <div className={styles.carter_oms_card_body}>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Opportunity</span>
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    <span
                      style={{
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {opportunity.Name || '-'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Type</span>
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    <span style={{ fontSize: '12px' }}>{opportunity.Type || '---'}</span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Close date</span>
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    <span style={{ fontSize: '12px' }}>{formatDate(opportunity.CloseDate) || '---'}</span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Amount</span>
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    <span style={{ fontSize: '13px' }}>{formatCurrency(opportunity.Amount)}</span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Stage</span>
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    <span style={{ fontSize: '12px' }}>{opportunity.StageName || '---'}</span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Owner</span>
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    <span
                      style={{
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {opportunity.Owner?.Name || '---'}
                    </span>
                  </Typography>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '8px'}}>
                <TicketCount
                  sourceId={opportunity.Id}
                  sourceType="opportunity"
                  tickets={tickets?.[opportunity.Id]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CarterOMSOpportunityCards;
