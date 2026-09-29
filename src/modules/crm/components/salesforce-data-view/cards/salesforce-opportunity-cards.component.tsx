import React from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Plus as PlusIcon, Database } from 'lucide-react';
import { getOpportunityColumns } from '../../../helpers/salesforce-columns.helper';
import TicketCount from '../ticket-count.component';
import { CardComponentProps } from '../types';
import styles from '../../../styles/crm.module.scss';

interface SalesforceOpportunityCardsProps extends Omit<CardComponentProps, 'onCreateTicket'> {
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'opportunity') => void;
  tickets?: { [opportunityId: string]: any[] };
}

const SalesforceOpportunityCards: React.FC<SalesforceOpportunityCardsProps> = ({
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
      <div className={styles.opportunities_grid}>
        {opportunities.map((opportunity: any) => {
          return (
            <div 
              key={opportunity.Id} 
              className={styles.opportunity_card}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/crm/opportunities/${opportunity.Id}`)}
            >
              <div className={styles.opportunity_card_header}>
                <div className={styles.opportunity_title_section}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Image
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png"
                      alt="Salesforce"
                      width={50}
                      height={34}
                      style={{ objectFit: 'contain', alignSelf: 'flex-start' }}
                    />
                  </div>
                </div>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTicket(opportunity, 'opportunity');
                  }}
                  style={{ 
                    position: 'relative', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  <PlusIcon size={14} color={carterColors['brand-600']} />
                  <Typography 
                    variant="caption-regular" 
                    color={carterColors['brand-600']}
                  >
                    Create Ticket
                  </Typography>
                </div>
              </div>
              
              <div className={styles.opportunity_card_body}>
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Opportunity
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {opportunity.Name || '-'}
                  </Typography>
                </div>
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Type
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {opportunity.Type || '---'}
                  </Typography>
                </div>
                
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Close date
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {formatDate(opportunity.CloseDate) || '---'}
                  </Typography>
                </div>
                
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Amount
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {formatCurrency(opportunity.Amount)}
                  </Typography>
                </div>

                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Stage
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {opportunity.StageName || '---'}
                  </Typography>
                </div>
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Owner
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {opportunity.Owner?.Name || '---'}
                  </Typography>
                </div>
              </div>

              <TicketCount 
                sourceId={opportunity.Id} 
                sourceType="opportunity" 
                tickets={tickets?.[opportunity.Id]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesforceOpportunityCards;
