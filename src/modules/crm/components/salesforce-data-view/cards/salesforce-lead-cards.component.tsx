import React from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Plus as PlusIcon, Database } from 'lucide-react';
import { getLeadColumns } from '../../../helpers/salesforce-columns.helper';
import TicketCount from '../ticket-count.component';
import LeadStatusProgress from '../lead-status-progress.component';
import { CardComponentProps } from '../types';
import styles from '../../../styles/crm.module.scss';

interface SalesforceLeadCardsProps extends Omit<CardComponentProps, 'onCreateTicket'> {
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'lead') => void;
  tickets?: { [leadId: string]: any[] };
}

const SalesforceLeadCards: React.FC<SalesforceLeadCardsProps> = ({
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
      <div className={styles.opportunities_grid}>
        {leads.map((lead: any) => {
          return (
            <div 
              key={lead.Id} 
              className={styles.opportunity_card}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/crm/leads/${lead.Id}`)}
            >
              <div className={styles.opportunity_card_header}>
                <div className={styles.opportunity_title_section}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Image
                      src='https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png'
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
                    onCreateTicket(lead, 'lead');
                  }}
                  style={{ 
                    position: 'relative', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: '12px',
                    gap: '4px',
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
                  <div>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                      Lead
                    </Typography>
                  </div>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      {lead.FirstName && lead.LastName 
                        ? `${lead.FirstName} ${lead.LastName}`.trim()
                        : lead.Name || '-'}
                    </Typography>
                  </div>
                </div>
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Company
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {lead.Company || '---'}
                  </Typography>
                </div>
                
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Email
                  </Typography>
                  <div style={{ cursor: lead.Email ? 'pointer' : 'default' }}>
                    <Typography variant="body-regular" color={lead.Email ? carterColors['brand-600'] : carterColors['text-600']}>
                      {lead.Email || '---'}
                    </Typography>
                  </div>
                </div>
                
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Phone
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {lead.Phone || '---'}
                  </Typography>
                </div>
                <div className={styles.opportunity_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Owner
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {lead.Owner?.Name || '---'}
                  </Typography>
                </div>

                <div className={styles.opportunity_field} style={{ gridColumn: '1 / -1', overflow: 'visible', position: 'relative' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                      Status
                    </Typography>
                  </div>
                  {lead.Status ? (
                    <LeadStatusProgress status={lead.Status} />
                  ) : (
                    <Typography variant="body-regular" color={carterColors['text-600']}>
                      ---
                    </Typography>
                  )}
                </div>
              </div>

              <TicketCount 
                sourceId={lead.Id} 
                sourceType="lead" 
                tickets={tickets?.[lead.Id]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesforceLeadCards;
