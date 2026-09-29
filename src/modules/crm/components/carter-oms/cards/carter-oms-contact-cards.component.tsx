import React from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Plus as PlusIcon, Database } from 'lucide-react';
import { getContactColumns } from '../../../helpers/salesforce-columns.helper';
import TicketCount from '../../salesforce-data-view/ticket-count.component';
import { CardComponentProps } from '../../salesforce-data-view/types';
import styles from '../../../styles/crm.module.scss';

interface CarterOMSContactCardsProps extends Omit<CardComponentProps, 'onCreateTicket'> {
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'contact') => void;
  tickets?: { [contactId: string]: any[] };
  logoUrl: string;
}

const CarterOMSContactCards: React.FC<CarterOMSContactCardsProps> = ({
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
      <div className={styles.carter_oms_cards_grid}>
        {contacts.map((contact: any) => {
          return (
            <div
              key={contact.Id}
              className={styles.carter_oms_card}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/crm/contacts/${contact.Id}?ref=carter`)}
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
                    onCreateTicket(contact, 'contact');
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
                    <span style={{ fontSize: '10px' }}>Contact</span>
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
                      {contact.FirstName && contact.LastName
                        ? `${contact.FirstName} ${contact.LastName}`.trim()
                        : contact.Name || '-'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Email</span>
                  </Typography>
                  <Typography
                    variant="body-regular"
                    color={contact.Email ? carterColors['brand-600'] : carterColors['text-600']}
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
                      {contact.Email || '---'}
                    </span>
                  </Typography>
                </div>
                <div className={styles.carter_oms_field}>
                  <Typography variant="caption-regular" color={carterColors['text-600']}>
                    <span style={{ fontSize: '10px' }}>Phone</span>
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    <span style={{ fontSize: '12px' }}>{contact.Phone || '---'}</span>
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
                      {contact.Owner?.Name || '---'}
                    </span>
                  </Typography>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '8px'}}>
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

export default CarterOMSContactCards;
