import React from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Plus as PlusIcon, Database } from 'lucide-react';
import { getContactColumns } from '../../../helpers/salesforce-columns.helper';
import TicketCount from '../ticket-count.component';
import { CardComponentProps } from '../types';
import styles from '../../../styles/crm.module.scss';

interface SalesforceContactCardsProps extends Omit<CardComponentProps, 'onCreateTicket'> {
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'contact') => void;
  tickets?: { [contactId: string]: any[] };
  logoUrl?: string;
}

const SalesforceContactCards: React.FC<SalesforceContactCardsProps> = ({
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
  const contacts = data as any[];

  if (!contacts || contacts.length === 0) {
    return (
      <div className={styles.empty_state}>
        <Database size={32} color={carterColors['text-400']} />
        <Typography variant="body-regular" color={carterColors['text-600']}>
          {searchTerm
            ? `No contacts found matching "${searchTerm}"`
            : `No contacts found`}
        </Typography>
      </div>
    );
  }

  if (viewMode === 'table') {
    const columns = getContactColumns(onNameClick, (contact) => onCreateTicket(contact, 'contact'));
    return (
      <div className={styles.opportunities_wrapper}>
        <div className={styles.data_table_wrapper}>
          <DataTable
            columns={columns as any}
            data={contacts}
            loading={isLoading}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            enableColumnHiding={enableColumnHiding}
            fallback={{
              title: `No contacts found`,
              description: searchTerm
                ? `Try adjusting your search term`
                : `No contacts data available`,
            }}
            pagination={{
              pageNo: 1,
              pageSize: 50,
              totalCount: contacts.length,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.opportunities_wrapper}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px' 
      }}>
        {contacts.map((contact: any) => {
          return (
            <div 
              key={contact.Id}
              style={{
                background: 'white',
                border: `1px solid ${carterColors['grey-200']}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '200px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 2px 8px ${carterColors['grey-200']}`;
                e.currentTarget.style.borderColor = carterColors['grey-300'];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = carterColors['grey-200'];
              }}
              onClick={() => router.push(`/crm/contacts/${contact.Id}`)}
            >
              {/* Header with Logo and Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Image
                  src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png"}
                  alt={logoUrl ? "Carter" : "Salesforce"}
                  width={60}
                  height={42}
                  style={{ objectFit: 'contain' }}
                />
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTicket(contact, 'contact');
                  }}
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: carterColors['brand-100'],
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['brand-200'];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = carterColors['brand-100'];
                  }}
                >
                  <PlusIcon size={14} color={carterColors['brand-600']} />
                  <Typography 
                    variant="caption-semibold" 
                    color={carterColors['brand-600']}
                  >
                    Ticket
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Contact
                  </Typography>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {contact.FirstName && contact.LastName
                      ? `${contact.FirstName} ${contact.LastName}`.trim()
                      : contact.Name || '-'}
                  </Typography>
                </div>
                
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Email
                  </Typography>
                  <Typography
                    variant="caption-regular"
                    color={contact.Email ? carterColors['brand-600'] : carterColors['text-600']}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {contact.Email || '---'}
                    </span>
                  </Typography>
                </div>
                
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Phone
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {contact.Phone || '---'}
                  </Typography>
                </div>
                
                <div>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Owner
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {contact.Owner?.Name || '---'}
                  </Typography>
                </div>
              </div>

              {/* Tickets at bottom */}
              <div style={{ paddingTop: '8px', borderTop: `1px solid ${carterColors['grey-200']}` }}>
                <TicketCount 
                  sourceId={contact.Id} 
                  sourceType="contact" 
                  tickets={tickets?.[contact.Id]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesforceContactCards;
