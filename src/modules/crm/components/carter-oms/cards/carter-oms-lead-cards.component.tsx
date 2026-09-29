import React from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Plus as PlusIcon, Database } from 'lucide-react';
import { getLeadColumns } from '../../../helpers/salesforce-columns.helper';
import TicketCount from '../../salesforce-data-view/ticket-count.component';
import { CardComponentProps } from '../../salesforce-data-view/types';
import styles from '../../../styles/crm.module.scss';

interface CarterOMSLeadCardsProps extends Omit<CardComponentProps, 'onCreateTicket'> {
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'lead') => void;
  tickets?: { [leadId: string]: any[] };
  logoUrl: string;
}

const CarterOMSLeadCards: React.FC<CarterOMSLeadCardsProps> = ({
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
  const leads = data as any[];

  if (!leads || leads.length === 0) {
    return (
      <div className={styles.empty_state}>
        <Database size={32} color={carterColors['text-400']} />
        <Typography variant="body-regular" color={carterColors['text-600']}>
          {searchTerm
            ? `No leads found matching "${searchTerm}"`
            : `No leads found`}
        </Typography>
      </div>
    );
  }

  if (viewMode === 'table') {
    const columns = getLeadColumns(
      (lead) => onCreateTicket(lead, 'lead'),
      onNameClick
    );
    return (
      <div className={styles.opportunities_wrapper}>
        <div className={styles.data_table_wrapper}>
          <DataTable
            columns={columns as any}
            data={leads}
            loading={isLoading}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            enableColumnHiding={enableColumnHiding}
            fallback={{
              title: `No leads found`,
              description: searchTerm
                ? `Try adjusting your search term`
                : `No leads data available`,
            }}
            pagination={{
              pageNo: 1,
              pageSize: 50,
              totalCount: leads.length,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.opportunities_wrapper}>
      <div className={styles.carter_oms_cards_grid}>
        {leads.map((lead: any) => {
          return (
            <div
              key={lead.Id}
              className={styles.carter_oms_card}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/crm/leads/${lead.Id}?ref=carter`)}
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
                    onCreateTicket(lead, 'lead');
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
                    <span style={{ fontSize: '10px' }}>Lead</span>
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
                      {lead.FirstName && lead.LastName
                        ? `${lead.FirstName} ${lead.LastName}`.trim()
                        : lead.Name || '-'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Company</span>
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    <span
                      style={{
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {lead.Company || '---'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Email</span>
                  </Typography>
                  <Typography
                    variant="body-regular"
                    color={lead.Email ? carterColors['brand-600'] : carterColors['text-600']}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {lead.Email || '---'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Phone</span>
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    <span style={{ fontSize: '12px' }}>{lead.Phone || '---'}</span>
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
                      {lead.Owner?.Name || '---'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Status</span>
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    <span style={{ fontSize: '12px' }}>{lead.Status || '---'}</span>
                  </Typography>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '8px'}}>
                <TicketCount
                  sourceId={lead.Id}
                  sourceType="lead"
                  tickets={tickets?.[lead.Id]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CarterOMSLeadCards;
